import asyncio
import random
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

app = FastAPI()
app.add_middleware(
    CORSMiddleware, 
    allow_origins=["*"], 
    allow_credentials=True, 
    allow_methods=["*"], 
    allow_headers=["*"]
)

class PIDController:
    def __init__(self, kp, ki, out_min=0.0, out_max=100.0):
        self.kp = kp
        self.ki = ki
        self.out_min = out_min
        self.out_max = out_max
        self.integral = 0.0

    def compute(self, sp, pv):
        error = sp - pv
        self.integral = max(min(self.integral + error, 50), -50)
        return max(self.out_min, min(self.out_max, (self.kp * error) + (self.ki * self.integral)))

class SimulationEngine:
    def __init__(self):
        self.pump_H1_on = True
        self.pump_H2_on = True
        self.pump_H3_on = True
        self.auto_mode = True
        self.sp_temp = 335.0
        self.pid = PIDController(kp=2.5, ki=0.5)
        
        self.valve_feed = 80.0
        self.valve_gas = 83.5
        self.pcv_221 = 40.0
        self.avz_1 = 80.0
        self.valve_drain_E1 = 30.0
        self.demulsifier_feed = 25.0
        
        self.voltage_E1 = 4.8
        self.water_level_E1 = 40.0
        
        self.avz_broken = False
        self.pcv_stuck = False
        self.gas_stuck = False
        self.gas_loss = False
        
        self.level_K1 = 50.0
        self.pressure_K1 = 2.5
        self.temp_top_K1 = 140.0
        
        self.level_K2 = 45.0
        self.pressure_K2 = 1.2
        self.temp_K2 = 250.0
        
        self.temp_p3_out = 335.0
        
        self.vib_H1 = 2.1
        self.vib_H2 = 1.8
        self.vib_H3 = 1.9
        
        self.alarms = []
        self.score = 100
        self.exploded = False

    def reset(self):
        self.__init__()

    def trigger_water_slug(self):
        self.pressure_K1 += 1.8
        self.alarms.append("⚠️ ГИДРОУДАР! Вскипание воды в печи П-3!")
        self.score -= 15

    def update(self):
        if self.exploded:
            return
        self.alarms.clear()
        
        flow_H1 = 150.0 if self.pump_H1_on else 0.0
        self.water_level_E1 += (flow_H1 * 0.05 - (self.valve_drain_E1 / 100.0) * 15.0) * 0.1
        self.water_level_E1 = max(0.0, min(100.0, self.water_level_E1 + random.uniform(-0.1, 0.1)))
        
        if self.water_level_E1 > 80.0 and self.voltage_E1 > 0:
            self.voltage_E1 = 0.0
            self.alarms.append("[ПАЗ] Короткое замыкание Э-1! Высокий уровень воды.")
            self.score -= 10
            
        flow_to_K1 = flow_H1 * (self.valve_feed / 100.0)
        flow_H3 = 120.0 if self.pump_H3_on else 0.0
        
        if self.voltage_E1 < 2.0 or self.demulsifier_feed < 5.0:
            if flow_to_K1 > 0:
                self.pressure_K1 += random.uniform(0.05, 0.15)
                self.alarms.append("⚠️ НАРУШЕНИЕ ОБЕССОЛИВАНИЯ! Вода поступает в К-1.")
                
        self.level_K1 += (flow_to_K1 - flow_H3) * 0.05 + random.uniform(-0.1, 0.1)
        self.level_K1 = max(0.0, min(100.0, self.level_K1))
        
        if self.pump_H1_on:
            self.vib_H1 = 2.1 + random.uniform(-0.1, 0.1)
        else:
            self.vib_H1 = 0.0
            
        if self.pump_H3_on:
            if self.level_K1 < 15.0:
                self.vib_H3 = min(12.0, self.vib_H3 + 0.4 + random.uniform(0, 0.2))
                self.alarms.append(f"⚠️ КАВИТАЦИЯ Н-3! Вибрация: {self.vib_H3:.1f} мм/с")
            else:
                self.vib_H3 = max(1.9, self.vib_H3 - 0.5) + random.uniform(-0.1, 0.1)
        else:
            self.vib_H3 = 0.0
            
        if self.vib_H3 > 9.0 and self.pump_H3_on:
            self.alarms.append("[ПАЗ] Разрушение Н-3.")
            self.pump_H3_on = False
            self.score -= 20

        if self.gas_loss:
            self.valve_gas = 0.0
            self.alarms.append("❗️ ОБРЫВ ПЛАМЕНИ П-3! Нет давления в сети.")
        elif self.auto_mode and not self.gas_stuck:
            self.valve_gas = self.pid.compute(self.sp_temp, self.temp_p3_out)
        
        heat_in = (self.valve_gas / 100.0) * 3000.0
        target_temp = 200.0 + (heat_in / flow_H3) * 6.47 if flow_H3 > 0 else 900.0
        
        if flow_H3 == 0 and heat_in > 0:
            target_temp = 900.0
            self.alarms.append("🔥 ОПАСНОСТЬ ПРОГАРА ТРУБ П-3! Нет циркуляции.")
            
        self.temp_p3_out += (target_temp - self.temp_p3_out) / 4.0
        
        vapor_gen = max(0, (self.temp_p3_out - 200) * 0.02)
        relief = (self.pcv_221 / 100.0) * 6.75
        self.pressure_K1 = max(1.0, self.pressure_K1 + (vapor_gen - relief) * 0.1 + random.uniform(-0.02, 0.02))

        cooling = (self.avz_1 / 100.0) * 50.0 if not self.avz_broken else 0
        self.temp_top_K1 += (max(20.0, self.temp_p3_out * 0.537 - cooling) - self.temp_top_K1) / 3.0

        flow_H2 = 120.0 if self.pump_H2_on else 0.0
        self.level_K2 += (flow_H3 - flow_H2) * 0.05 + random.uniform(-0.1, 0.1)
        self.level_K2 = max(0.0, min(100.0, self.level_K2))
        self.temp_K2 += (self.temp_p3_out * 0.8 - self.temp_K2) / 5.0
        self.pressure_K2 = 1.0 + max(0, (self.temp_K2 - 200) * 0.01)

        if self.pump_H2_on:
            if self.level_K2 < 15.0:
                self.vib_H2 = min(12.0, self.vib_H2 + 0.4 + random.uniform(0, 0.2))
                self.alarms.append(f"⚠️ КАВИТАЦИЯ Н-2! Вибрация: {self.vib_H2:.1f} мм/с")
            else:
                self.vib_H2 = max(1.8, self.vib_H2 - 0.5) + random.uniform(-0.1, 0.1)
        else:
            self.vib_H2 = 0.0

        if self.vib_H2 > 9.0 and self.pump_H2_on:
            self.alarms.append("[ПАЗ] Разрушение Н-2.")
            self.pump_H2_on = False
            self.score -= 20

        if self.pressure_K1 > 4.5:
            self.alarms.append("[ПАЗ] Высокое давление в К-1 (>4.5 кгс/см2)!")
            self.score -= 5
            if self.pressure_K1 > 5.4:
                self.alarms.append("💥 ВЗРЫВ КОЛОННЫ К-1 ОТ ИЗБЫТОЧНОГО ДАВЛЕНИЯ!")
                self.exploded = True
                self.score = 0
                
        if self.level_K1 >= 100.0 or self.level_K2 >= 100.0:
            self.alarms.append("🚫 ЗАХЛЕБЫВАНИЕ! Унос жидкости.")
            self.score -= 10
                
        if self.temp_top_K1 > 150.0:
            self.alarms.append("[СИГНАЛИЗАЦИЯ] Перегрев верха К-1 (>150°C)")
            self.score -= 2
            
        if self.temp_p3_out >= 360.0:
            self.alarms.append("🔥 КРИТИЧЕСКАЯ АВАРИЯ: ПРОГАР ПЕЧИ П-3!")
            self.score -= 10
            
        self.score = max(0, self.score)

engine = SimulationEngine()

class Command(BaseModel):
    action: str
    value: Optional[float] = None

async def simulation_loop():
    while True:
        engine.update()
        await asyncio.sleep(1.0)

@app.on_event("startup")
async def startup_event(): 
    asyncio.create_task(simulation_loop())

@app.get("/api/state")
async def get_state():
    return {
        "score": engine.score, 
        "alarms": engine.alarms, 
        "exploded": engine.exploded,
        "pump_H1": engine.pump_H1_on, 
        "pump_H2": engine.pump_H2_on,
        "pump_H3": engine.pump_H3_on,
        "valve_feed": round(engine.valve_feed, 1),
        "valve_drain_E1": round(engine.valve_drain_E1, 1),
        "demulsifier_feed": round(engine.demulsifier_feed, 1),
        "voltage_E1": round(engine.voltage_E1, 1),
        "water_level_E1": round(engine.water_level_E1, 1),
        "flow_in": round(150.0 * (engine.valve_feed / 100.0) if engine.pump_H1_on else 0, 1),
        "level_K1": round(engine.level_K1, 1), 
        "pressure_K1": round(engine.pressure_K1, 2), 
        "temp_top_K1": round(engine.temp_top_K1, 1),
        "level_K2": round(engine.level_K2, 1), 
        "pressure_K2": round(engine.pressure_K2, 2), 
        "temp_K2": round(engine.temp_K2, 1),
        "flow_H3": 120.0 if engine.pump_H3_on else 0.0,
        "flow_out": 120.0 if engine.pump_H2_on else 0.0,
        "TRC3_mode": "AUTO" if engine.auto_mode else "MANUAL", 
        "valve_gas": round(engine.valve_gas, 1), 
        "temp_P3": round(engine.temp_p3_out, 1),
        "pcv_221": round(engine.pcv_221, 1), 
        "avz_1": round(engine.avz_1, 1),
        "avz_broken": engine.avz_broken, 
        "pcv_stuck": engine.pcv_stuck, 
        "gas_stuck": engine.gas_stuck,
        "vib_H1": round(engine.vib_H1, 2),
        "vib_H2": round(engine.vib_H2, 2),
        "vib_H3": round(engine.vib_H3, 2)
    }

@app.post("/api/command")
async def send_command(cmd: Command):
    if cmd.action == "set_pump_h1": engine.pump_H1_on = bool(cmd.value)
    elif cmd.action == "set_pump_h2": engine.pump_H2_on = bool(cmd.value)
    elif cmd.action == "set_pump_h3": engine.pump_H3_on = bool(cmd.value)
    elif cmd.action == "set_feed_valve": engine.valve_feed = cmd.value
    elif cmd.action == "set_drain_e1": engine.valve_drain_E1 = cmd.value
    elif cmd.action == "set_demulsifier": engine.demulsifier_feed = cmd.value
    elif cmd.action == "restore_voltage":
        if engine.water_level_E1 < 75.0: engine.voltage_E1 = 4.8
    elif cmd.action == "set_pcv": 
        if not engine.pcv_stuck: engine.pcv_221 = cmd.value
    elif cmd.action == "set_avz": engine.avz_1 = cmd.value
    elif cmd.action == "set_trc3_mode": engine.auto_mode = bool(cmd.value)
    elif cmd.action == "set_gas_valve":
        if not engine.auto_mode and not engine.gas_stuck and not engine.gas_loss: 
            engine.valve_gas = cmd.value
    elif cmd.action == "break_pump_h1": engine.pump_H1_on = False
    elif cmd.action == "jam_pcv": engine.pcv_stuck = True; engine.pcv_221 = 0.0
    elif cmd.action == "jam_gas": engine.gas_stuck = True; engine.valve_gas = 100.0; engine.auto_mode = False
    elif cmd.action == "break_avz": engine.avz_broken = True; engine.avz_1 = 0.0
    elif cmd.action == "water_slug": engine.trigger_water_slug()
    elif cmd.action == "gas_loss": engine.gas_loss = True; engine.auto_mode = False
    elif cmd.action == "short_circuit": engine.valve_drain_E1 = 0.0; engine.water_level_E1 = 85.0
    elif cmd.action == "demulsifier_fail": engine.demulsifier_feed = 0.0
    return {"status": "success"}

@app.post("/api/reset")
async def reset():
    engine.reset()
    return {"status": "success"}