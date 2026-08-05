import random

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
        self.valve_feed = 80.0
        self.pump_H2_on = True
        self.auto_mode = True
        self.sp_temp = 335.0
        self.pid = PIDController(kp=2.5, ki=0.5)
        self.valve_gas = 83.5
        self.pcv_221 = 40.0
        self.avz_1 = 80.0
        self.avz_broken = False
        self.pcv_stuck = False
        self.gas_stuck = False
        self.level_K1 = 50.0
        self.temp_p3_out = 335.0
        self.pressure_K1 = 2.5
        self.temp_top_K1 = 140.0
        self.alarms = []
        self.score = 100
        self.exploded = False

    def reset(self):
        self.__init__()

    def update(self):
        if self.exploded:
            return
        self.alarms.clear()
        
        flow_in = 150.0 * (self.valve_feed / 100.0) if self.pump_H1_on else 0.0
        flow_out = 120.0 if self.pump_H2_on else 0.0
        self.level_K1 = max(0.0, min(100.0, self.level_K1 + (flow_in - flow_out) * 0.05 + random.uniform(-0.1, 0.1)))
        
        if self.level_K1 <= 5.0 and self.pump_H2_on:
            self.alarms.append("[ПАЗ] Низкий уровень К-1! Кавитация. Остановка Н-2!")
            self.pump_H2_on = False
            self.score -= 10

        if self.auto_mode and not self.gas_stuck:
            self.valve_gas = self.pid.compute(self.sp_temp, self.temp_p3_out)
        
        heat_in = (self.valve_gas / 100.0) * 3000.0
        target_temp = 200.0 + (heat_in / flow_out) * 6.47 if flow_out > 0 else 900.0
        self.temp_p3_out += (target_temp - self.temp_p3_out) / 4.0
        
        vapor_gen = max(0, (self.temp_p3_out - 200) * 0.02)
        relief = (self.pcv_221 / 100.0) * 6.75
        self.pressure_K1 = max(1.0, self.pressure_K1 + (vapor_gen - relief) * 0.1 + random.uniform(-0.02, 0.02))

        cooling = (self.avz_1 / 100.0) * 50.0 if not self.avz_broken else 0
        self.temp_top_K1 += (max(20.0, self.temp_p3_out * 0.537 - cooling) - self.temp_top_K1) / 3.0

        if self.pressure_K1 > 4.5:
            self.alarms.append("[ПАЗ] Высокое давление в К-1 (>4.5 кгс/см2)!")
            self.score -= 5
            if self.pressure_K1 > 5.2:
                self.alarms.append("💥 ВЗРЫВ КОЛОННЫ К-1 ОТ ИЗБЫТОЧНОГО ДАВЛЕНИЯ!")
                self.exploded = True
                self.score = 0
                
        if self.temp_top_K1 > 150.0:
            self.alarms.append("[СИГНАЛИЗАЦИЯ] Перегрев верха К-1 (>150°C)")
            self.score -= 2
            
        if self.temp_p3_out >= 360.0:
            self.alarms.append("🔥 КРИТИЧЕСКАЯ АВАРИЯ: ПРОГАР ПЕЧИ П-3!")
            self.score -= 10
            
        self.score = max(0, self.score)