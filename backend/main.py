import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from physics import SimulationEngine

app = FastAPI()
app.add_middleware(
    CORSMiddleware, 
    allow_origins=["*"], 
    allow_credentials=True, 
    allow_methods=["*"], 
    allow_headers=["*"]
)
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
        "valve_feed": round(engine.valve_feed, 1),
        "flow_in": round(150.0 * (engine.valve_feed / 100.0) if engine.pump_H1_on else 0, 1),
        "level_K1": round(engine.level_K1, 1), 
        "pressure_K1": round(engine.pressure_K1, 2), 
        "temp_top_K1": round(engine.temp_top_K1, 1),
        "pump_H2": engine.pump_H2_on, 
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
        "vib_H2": round(engine.vib_H2, 2)
    }

@app.post("/api/command")
async def send_command(cmd: Command):
    if cmd.action == "set_pump_h1": engine.pump_H1_on = bool(cmd.value)
    elif cmd.action == "set_pump_h2": engine.pump_H2_on = bool(cmd.value)
    elif cmd.action == "set_feed_valve": engine.valve_feed = cmd.value
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
    return {"status": "success"}

@app.post("/api/reset")
async def reset():
    engine.reset()
    return {"status": "success"}