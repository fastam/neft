import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const API_URL = "http://127.0.0.1:8000/api";

const RangeSlider = ({ value, onChange, disabled }) => {
  const [localVal, setLocalVal] = useState(value);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isDragging) {
      setLocalVal(value);
    }
  }, [value, isDragging]);

  const handleChange = (e) => {
    setLocalVal(e.target.value);
  };

  const handleCommit = () => {
    setIsDragging(false);
    onChange(parseFloat(localVal));
  };

  return (
    <input
      type="range"
      className="prop-slider"
      min="0"
      max="100"
      value={localVal}
      disabled={disabled}
      onMouseDown={() => setIsDragging(true)}
      onTouchStart={() => setIsDragging(true)}
      onChange={handleChange}
      onMouseUp={handleCommit}
      onTouchEnd={handleCommit}
      onBlur={handleCommit}
      style={{ background: `linear-gradient(to right, #38bdf8 ${localVal}%, #1e293b ${localVal}%)` }}
    />
  );
};

function App() {
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const scadaRef = useRef(null);
  
  const [state, setState] = useState({
    exploded: false, score: 100, alarms: [],
    pump_H1: true, pump_H2: true, pump_H3: true,
    valve_feed: 80.0, valve_drain_E1: 30.0, demulsifier_feed: 25.0, voltage_E1: 4.8, water_level_E1: 40.0,
    flow_in: 120.0, level_K1: 50.0, pressure_K1: 2.5, temp_top_K1: 140.0,
    level_K2: 45.0, pressure_K2: 1.2, temp_K2: 250.0,
    flow_H3: 120.0, flow_out: 120.0,
    TRC3_mode: "AUTO", valve_gas: 83.5, temp_P3: 335.0,
    pcv_221: 40.0, avz_1: 80.0,
    avz_broken: false, pcv_stuck: false, gas_stuck: false,
    vib_H1: 2.1, vib_H2: 1.8, vib_H3: 1.9
  });

  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const el = scadaRef.current;
    if (!el) return;

    const handleWheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(prev => Math.min(Math.max(0.5, prev + delta), 2.5));
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  const getPumpClass = (isOn, vib) => {
      if (!isOn || vib > 7.0) return "tag-value danger"; 
      if (vib > 4.0) return "tag-value warn";        
      return "tag-value ok";                          
  };

  const getPumpText = (isOn, vib) => {
      if (vib > 7.0) return "КАВИТАЦИЯ";
      return isOn ? "РАБОТА" : "СТОП";
  };

  const getVibStatus = (isOn, vib) => {
    if (!isOn) return 'red';          
    if (vib > 7.0) return 'red';
    if (vib > 4.0) return 'yellow';
    return 'green';
  };
  const getVibClass = (isOn, vib) => {
    if (!isOn || vib > 7.0) return 'tag-value danger';
    if (vib > 4.0) return 'tag-value warn';
    return 'tag-value ok';
  };

  const [alarmsList, setAlarmsList] = useState([]);
  const [activePanel, setActivePanel] = useState(null);
  const [aiMessage, setAiMessage] = useState("ИИ-Помощник активен. Вы можете перемещаться по схеме зажав левую кнопку мыши.");

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const timer = setInterval(async () => {
      setTime(new Date().toLocaleTimeString());
      try {
        const res = await fetch(`${API_URL}/state`);
        const data = await res.json();
        setState(data);
        if (data.alarms && data.alarms.length > 0) {
          data.alarms.forEach(al => {
            setAlarmsList(prev => !prev.find(a => a.text === al) 
              ? [{ id: Date.now()+Math.random(), time: new Date().toLocaleTimeString(), text: al, ack: false }, ...prev] 
              : prev);
          });
        }
      } catch (e) {}
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const cmd = async (action, value = null) => {
    const payload = { action };
    if (value !== null) {
      payload.value = value;
    }
    try {
      await fetch(`${API_URL}/command`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(payload) 
      });
    } catch (e) {}
  };
  
  const resetSimulation = async () => { 
    try {
      await fetch(`${API_URL}/reset`, { method: "POST" }); 
      setAlarmsList([]); 
      setActivePanel(null); 
      setPan({ x: 0, y: 0 });
      setAiMessage("Симуляция сброшена. Установка возвращена к нормальным параметрам."); 
    } catch (e) {}
  };

  const triggerEmergencyStop = async () => {
    await cmd('set_pump_h1', 0);
    await cmd('set_pump_h2', 0);
    await cmd('set_pump_h3', 0);
    await cmd('set_feed_valve', 0);
    await cmd('set_pcv', 100); 
    await cmd('set_trc3_mode', 0);
    await cmd('set_gas_valve', 0);
    setAiMessage("ВНИМАНИЕ! Сработала система ПАЗ. Установка экстренно остановлена, насосы отключены, весь газ сбрасывается на факел.");
  };

  const ackAlarm = (id) => setAlarmsList(alarmsList.map(a => a.id === id ? { ...a, ack: true } : a));

  const getC = (val, warn, danger, isInverse=false) => {
    if (isInverse) return val <= danger ? 'tag-value danger' : val <= warn ? 'tag-value warn' : 'tag-value ok';
    return val >= danger ? 'tag-value danger' : val >= warn ? 'tag-value warn' : 'tag-value ok';
  };

  const onMapMouseDown = (e) => {
    if (e.target.closest('.equipment-node') || e.target.closest('.valve-wrapper') || e.target.closest('.panel-title') || e.target.closest('.terminal-node')) return;
    setIsDraggingMap(true);
    setStartPos({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const onMapMouseMove = (e) => {
    if (!isDraggingMap || !scadaRef.current) return;
    let newX = e.clientX - startPos.x;
    let newY = e.clientY - startPos.y;

    const scadaRect = scadaRef.current.getBoundingClientRect();
    const canvasWidth = 2200;
    const canvasHeight = 1200;

    const minX = Math.min(0, scadaRect.width - canvasWidth);
    const maxX = 0;
    const minY = Math.min(0, scadaRect.height - canvasHeight);
    const maxY = 0;

    newX = Math.max(minX - 100, Math.min(maxX + 100, newX));
    newY = Math.max(minY - 100, Math.min(maxY + 100, newY));

    setPan({ x: newX, y: newY });
  };

  const onMapMouseUp = () => {
    if (!isDraggingMap) return;
    setIsDraggingMap(false);
    
    if (!scadaRef.current) return;
    const scadaRect = scadaRef.current.getBoundingClientRect();
    const canvasWidth = 2200;
    const canvasHeight = 1200;
    
    const minX = Math.min(0, scadaRect.width - canvasWidth);
    const maxX = 0;
    const minY = Math.min(0, scadaRect.height - canvasHeight);
    const maxY = 0;

    let snapX = pan.x;
    let snapY = pan.y;

    if (snapX > maxX) snapX = maxX;
    if (snapX < minX) snapX = minX;
    if (snapY > maxY) snapY = maxY;
    if (snapY < minY) snapY = minY;

    setPan({ x: snapX, y: snapY });
  };

  const getPanelTitle = () => {
    switch(activePanel) {
      case 'h1': return "СЫРЬЕВОЙ НАСОС Н-1";
      case 'e1': return "ЭЛЕКТРОДЕГИДРАТОР Э-1";
      case 'fcv': return "КЛАПАН СЫРЬЯ FCV-1";
      case 'k1': return "КОЛОННА К-1";
      case 'pcv': return "СБРОС НА ФАКЕЛ PCV-221";
      case 'avz': return "АППАРАТ ВОЗД. ОХЛАЖДЕНИЯ АВЗ-1";
      case 'h3': return "НАСОС КУБА К-1 Н-3";
      case 'trc3': return "ПЕЧЬ П-3 / РЕГУЛЯТОР (TRC-3)";
      case 'k2': return "КОЛОННА К-2";
      case 'h2': return "НАСОС КУБА К-2 Н-2";
      default: return "ВЫБЕРИТЕ ОБЪЕКТ";
    }
  };

  if (state.exploded) return (
    <div className="explosion-overlay">
      <div className="explosion-text">💥 ВЗРЫВ КОЛОННЫ 💥</div>
      <p style={{color: '#fff', fontSize: 24, marginBottom: 30}}>Критическое превышение давления. Аппарат разрушен.</p>
      <button className="btn btn-success" style={{width: 300, fontSize: 16}} onClick={resetSimulation}>ПЕРЕЗАПУСК ТРЕНАЖЕРА</button>
    </div>
  );

  return (
    <div className="dashboard-layout">
      <header className="top-header glass-panel">
        <div className="brand">
          <h1>КТК: ЭЛОУ-АВТ-4</h1><div className="divider"></div><span>Полномасштабный Тренажер</span>
        </div>
        <div className="sys-info">
          <button className="btn btn-danger" style={{padding: '6px 12px', width: 'auto', fontWeight: 'bold'}} onClick={triggerEmergencyStop}>🛑 ПАЗ УСТАНОВКИ</button>
          <div className="sys-item"><span className="label">СВЯЗЬ:</span><span className="led green"></span><span>ОНЛАЙН</span></div>
          <div className="sys-item"><span>{time}</span></div>
          <div className="score-badge">ОЦЕНКА: {state.score}/100</div>
        </div>
      </header>

      <div 
        className={`scada-area ${isDraggingMap ? 'dragging' : ''}`}
        ref={scadaRef}
        onMouseDown={onMapMouseDown} 
        onMouseMove={onMapMouseMove} 
        onMouseUp={onMapMouseUp} 
        onMouseLeave={onMapMouseUp}
      >
        <div className="panel-title" style={{position:'absolute', top: 16, left: 16, zIndex: 10, background: '#0f172a', padding: '4px 8px', borderRadius: 4, border: '1px solid #334155', color: '#94a3b8', margin: 0}}>МНЕМОСХЕМА АСУ ТП</div>
        
        <div className="scada-canvas" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}>
          <svg className="svg-layer" viewBox="0 0 2200 1200" width="2200" height="1200">
            {/* Н-1 to Э-1 */}
            <path d="M 300 700 L 450 700" className="svg-pipe-bg" />
            {state.pump_H1 && <path d="M 300 700 L 450 700" className="svg-pipe-flow" />}
            
            {/* Э-1 to K-1 */}
            <path d="M 650 700 L 860 700 Q 880 700 880 680 L 880 620 Q 880 600 900 600" className="svg-pipe-bg" />
            {state.pump_H1 && state.valve_feed > 0 && <path d="M 650 700 L 860 700 Q 880 700 880 680 L 880 620 Q 880 600 900 600" className="svg-pipe-flow" />}

            {/* K-1 top to PCV / Flare */}
            <path d="M 1000 510 L 1000 120" className="svg-pipe-bg" />
            {state.pcv_221 > 0 && <path d="M 1000 510 L 1000 120" className="svg-pipe-flow flare" />}

            {/* K-1 top to AVZ */}
            <path d="M 1000 420 Q 1000 400 1020 400 L 1200 400" className="svg-pipe-bg" />
            {!state.avz_broken && <path d="M 1000 420 Q 1000 400 1020 400 L 1200 400" className="svg-pipe-flow gas" />}

            {/* AVZ outlet */}
            <path d="M 1400 400 L 1550 400" className="svg-pipe-bg" />
            {!state.avz_broken && <path d="M 1400 400 L 1550 400" className="svg-pipe-flow gas" />}

            {/* K-1 bottom to H-3 */}
            <path d="M 1000 690 L 1000 860" className="svg-pipe-bg" />
            {state.pump_H3 && <path d="M 1000 690 L 1000 860" className="svg-pipe-flow" />}

            {/* H-3 to P-3 */}
            <path d="M 1100 900 L 1300 900" className="svg-pipe-bg" />
            {state.pump_H3 && <path d="M 1100 900 L 1300 900" className="svg-pipe-flow" />}

            {/* Gas Line to P-3 */}
            <path d="M 1400 670 L 1400 840" className="svg-pipe-bg" />
            {state.valve_gas > 0 && <path d="M 1400 670 L 1400 840" className="svg-pipe-flow gas" />}

            {/* P-3 to K-2 */}
            <path d="M 1500 900 L 1660 900 Q 1680 900 1680 880 L 1680 620 Q 1680 600 1700 600" className="svg-pipe-bg" />
            {state.pump_H3 && <path d="M 1500 900 L 1660 900 Q 1680 900 1680 880 L 1680 620 Q 1680 600 1700 600" className="svg-pipe-flow" />}

            {/* K-2 bottom to H-2 */}
            <path d="M 1800 690 L 1800 860" className="svg-pipe-bg" />
            {state.pump_H2 && <path d="M 1800 690 L 1800 860" className="svg-pipe-flow" />}

            {/* H-2 to product storage */}
            <path d="M 1900 900 L 2050 900" className="svg-pipe-bg" />
            {state.pump_H2 && <path d="M 1900 900 L 2050 900" className="svg-pipe-flow" />}
          </svg>

          <div className="terminal-node" style={{left: 1000, top: 100}}>ФАКЕЛЬНАЯ<br/>СЕТЬ</div>
          <div className="terminal-node" style={{left: 1550, top: 400}}>ЕМКОСТЬ<br/>Е-2</div>
          <div className="terminal-node" style={{left: 1400, top: 650}}>ТОПЛИВНАЯ<br/>СЕТЬ</div>
          <div className="terminal-node" style={{left: 2100, top: 900}}>ТОВАРНЫЙ<br/>ПАРК</div>

          <div className={`equipment-node ${(!state.pump_H1 || state.vib_H1 > 5.0) ? 'alarm' : 'active'}`} 
            style={{left: 200, top: 700}} onClick={() => setActivePanel('h1')}>
            <div className="eq-header">Сырьевой Н-1</div>
            <div className="eq-body">
                <div className="tag-row">
                    <span className="tag-name">Статус</span>
                    <span className={getPumpClass(state.pump_H1, state.vib_H1)}>{getPumpText(state.pump_H1, state.vib_H1)}</span>
                </div>
                <div className="tag-row">
                    <span className="tag-name">Расход</span>
                    <span className="tag-value ok">{state.flow_in?.toFixed(1)} т/ч</span>
                </div>
            </div>
        </div>

          <div className={`equipment-node ${state.voltage_E1 === 0 ? 'alarm' : 'active'}`} style={{left: 550, top: 700}} onClick={() => setActivePanel('e1')}>
            <div className="eq-header">Электродегидратор Э-1</div>
            <div className="eq-body">
              <div className="tag-row"><span className="tag-name">Напряжение</span><span className={state.voltage_E1 > 0 ? "tag-value ok" : "tag-value danger"}>{state.voltage_E1.toFixed(1)} кВ</span></div>
              <div className="tag-row"><span className="tag-name">Уровень Воды</span><span className={state.water_level_E1 > 70 ? "tag-value danger" : "tag-value ok"}>{state.water_level_E1.toFixed(1)} %</span></div>
              <div className="tag-row"><span className="tag-name">Деэмульгатор</span><span className={state.demulsifier_feed < 10 ? "tag-value danger" : "tag-value ok"}>{state.demulsifier_feed.toFixed(1)} кг/ч</span></div>
            </div>
          </div>

          <div className="valve-wrapper" style={{left: 750, top: 700}} onClick={() => setActivePanel('fcv')}>
            <span className="valve-label">FCV-1</span>
            <svg className={`valve-bowtie ${state.valve_feed > 0 ? 'active' : ''}`} width="36" height="24" viewBox="0 0 32 24">
              <polygon points="2,8 2,22 16,15" /><polygon points="30,8 30,22 16,15" /><rect x="12" y="2" width="8" height="6" fill="currentColor" stroke="currentColor" /><path d="M16 8 v7" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>

          <div className={`equipment-node ${state.pressure_K1 >= 4.5 || state.level_K1 >= 95 ? 'alarm' : 'active'}`} style={{left: 1000, top: 600, height: 180}} onClick={() => setActivePanel('k1')}>
            <div className="eq-header">Колонна К-1</div>
            <div className="eq-body" style={{justifyContent: 'center'}}>
              <div className="tag-row"><span className="tag-name">Давление</span><span className={getC(state.pressure_K1, 4.0, 4.5)}>{state.pressure_K1.toFixed(2)} кгс</span></div>
              <div className="tag-row"><span className="tag-name">Темп. Верха</span><span className={getC(state.temp_top_K1, 145, 150)}>{state.temp_top_K1.toFixed(1)} °C</span></div>
              <div style={{height: 15}}></div>
              <div className="tag-row"><span className="tag-name">УРОВЕНЬ</span><span className={state.level_K1 >= 90 ? 'tag-value danger' : getC(state.level_K1, 20, 10, true)}>{state.level_K1.toFixed(1)} %</span></div>
              <div className="mini-bar"><div className="mini-bar-fill" style={{ width: `${state.level_K1}%`, background: state.level_K1>90||state.level_K1<10 ? '#ef4444':'#38bdf8' }}></div></div>
            </div>
          </div>

          <div className="valve-wrapper" style={{left: 1000, top: 250}} onClick={() => setActivePanel('pcv')}>
            <span className="valve-label">PCV-221 (Факел)</span>
            <svg className={`valve-bowtie ${state.pcv_stuck ? 'alarm' : state.pcv_221 > 0 ? 'active' : ''}`} width="36" height="24" viewBox="0 0 32 24">
              <polygon points="2,8 2,22 16,15" /><polygon points="30,8 30,22 16,15" /><rect x="12" y="2" width="8" height="6" fill="currentColor" stroke="currentColor" /><path d="M16 8 v7" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>

          <div className={`equipment-node ${state.avz_broken ? 'alarm' : 'active'}`} style={{left: 1300, top: 400}} onClick={() => setActivePanel('avz')}>
            <div className="eq-header">АВЗ-1 (Охлаждение)</div>
            <div className="eq-body">
              <div className="tag-row"><span className="tag-name">Обороты</span><span className={state.avz_broken?"tag-value danger":"tag-value ok"}>{state.avz_1.toFixed(0)} %</span></div>
              <div className="mini-bar"><div className="mini-bar-fill" style={{ width: `${state.avz_1}%`, background: '#38bdf8' }}></div></div>
            </div>
          </div>

          <div className={`equipment-node ${(!state.pump_H3 || state.vib_H3 > 5.0) ? 'alarm' : 'active'}`} 
              style={{left: 1000, top: 900}} onClick={() => setActivePanel('h3')}>
              <div className="eq-header">Насос Н-3 (Куб К-1)</div>
              <div className="eq-body">
                  <div className="tag-row">
                      <span className="tag-name">Статус</span>
                      <span className={getPumpClass(state.pump_H3, state.vib_H3)}>{getPumpText(state.pump_H3, state.vib_H3)}</span>
                  </div>
              </div>
          </div>

          <div className={`equipment-node ${state.temp_P3 > 350 ? 'alarm' : 'active'}`} style={{left: 1400, top: 900}} onClick={() => setActivePanel('trc3')}>
            <div className="eq-header">Печь П-3</div>
            <div className="eq-body">
              <div className="tag-row"><span className="tag-name">ТЕМП.</span><span className={getC(state.temp_P3, 340, 360)}>{state.temp_P3.toFixed(1)} °C</span></div>
              <div className="tag-row"><span className="tag-name">ГАЗ</span><span className="tag-value ok">{state.valve_gas.toFixed(1)} %</span></div>
              <div className="mini-bar"><div className="mini-bar-fill" style={{ width: `${state.valve_gas}%`, background: state.gas_stuck?'#ef4444':'#f59e0b' }}></div></div>
            </div>
          </div>

          <div className="valve-wrapper" style={{left: 1400, top: 750}} onClick={() => setActivePanel('trc3')}>
            <span className="valve-label">TRC-3 Газ</span>
            <svg className={`valve-bowtie ${state.gas_stuck ? 'alarm' : state.valve_gas > 0 ? 'active' : ''}`} width="36" height="24" viewBox="0 0 32 24">
              <polygon points="2,8 2,22 16,15" /><polygon points="30,8 30,22 16,15" /><rect x="12" y="2" width="8" height="6" fill="currentColor" stroke="currentColor" /><path d="M16 8 v7" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>

          <div className={`equipment-node ${state.level_K2 >= 95 ? 'alarm' : 'active'}`} style={{left: 1800, top: 600, height: 180}} onClick={() => setActivePanel('k2')}>
            <div className="eq-header">Колонна К-2</div>
            <div className="eq-body" style={{justifyContent: 'center'}}>
              <div className="tag-row"><span className="tag-name">Давление</span><span className={getC(state.pressure_K2, 1.8, 2.5)}>{state.pressure_K2.toFixed(2)} кгс</span></div>
              <div className="tag-row"><span className="tag-name">Темп. Куб</span><span className="tag-value ok">{state.temp_K2.toFixed(1)} °C</span></div>
              <div style={{height: 15}}></div>
              <div className="tag-row"><span className="tag-name">УРОВЕНЬ</span><span className={state.level_K2 >= 90 ? 'tag-value danger' : getC(state.level_K2, 20, 10, true)}>{state.level_K2.toFixed(1)} %</span></div>
              <div className="mini-bar"><div className="mini-bar-fill" style={{ width: `${state.level_K2}%`, background: state.level_K2>90||state.level_K2<10 ? '#ef4444':'#38bdf8' }}></div></div>
            </div>
          </div>

          <div className={`equipment-node ${(!state.pump_H2 || state.vib_H2 > 5.0) ? 'alarm' : 'active'}`} 
              style={{left: 1800, top: 900}} onClick={() => setActivePanel('h2')}>
              <div className="eq-header">Печной Н-2</div>
              <div className="eq-body">
                  <div className="tag-row">
                      <span className="tag-name">Статус</span>
                      <span className={getPumpClass(state.pump_H2, state.vib_H2)}>{getPumpText(state.pump_H2, state.vib_H2)}</span>
                  </div>
              </div>
          </div>
          
        </div>
      </div>
      <div className="glass-panel diag-area">
        <div className="panel-title">СИСТЕМА КОМПАКС (ВИБРАЦИЯ)</div>
        <div className="diag-list" style={{ overflowY: 'auto', flexGrow: 1 }}>
          <div className="diag-item">
            <span>
              <span className={`led ${getVibStatus(state.pump_H1, state.vib_H1)}`}></span>
              Н-1 (Сырье)
            </span>
            <span className={getVibClass(state.pump_H1, state.vib_H1)}>
              {state.vib_H1?.toFixed(2)} мм/с
            </span>
          </div>

          <div className="diag-item">
            <span>
              <span className={`led ${getVibStatus(state.pump_H3, state.vib_H3)}`}></span>
              Н-3 (Куб К-1)
            </span>
            <span className={getVibClass(state.pump_H3, state.vib_H3)}>
              {state.vib_H3?.toFixed(2)} мм/с
            </span>
          </div>

          <div className="diag-item">
            <span>
              <span className={`led ${getVibStatus(state.pump_H2, state.vib_H2)}`}></span>
              Н-2 (Куб К-2)
            </span>
            <span className={getVibClass(state.pump_H2, state.vib_H2)}>
              {state.vib_H2?.toFixed(2)} мм/с
            </span>
          </div>
        </div>
      </div>

      <div className="glass-panel props-area">
        <div className="panel-title">{getPanelTitle()}</div>
        <div className="prop-body">
          {!activePanel && <div className="empty-props">Выберите объект на схеме</div>}

          {activePanel === 'h1' && (<div>
            <div className="prop-item">
              <div className="prop-header">
                <span>Состояние:</span>
                <span className={state.pump_H1 ? "tag-value ok" : "tag-value danger"}>{state.pump_H1 ? 'РАБОТА' : 'СТОП'}</span>
              </div>
              <div className="mode-toggle">
                <button className={`mode-btn auto ${state.pump_H1 ? 'active' : ''}`} onClick={() => cmd('set_pump_h1', 1)}>ПУСК</button>
                <button className={`mode-btn off ${!state.pump_H1 ? 'active' : ''}`} onClick={() => cmd('set_pump_h1', 0)}>СТОП</button>
              </div>
            </div>
          </div>)}

          {activePanel === 'e1' && (<div>
            {state.voltage_E1 === 0 && <div className="alert-box">НАПРЯЖЕНИЕ ОТКЛЮЧЕНО! Слейте воду.</div>}
            
            <div className="prop-item">
              <div className="prop-header">
                <span>Напряжение:</span>
                <span className={state.voltage_E1 > 0 ? "tag-value ok" : "tag-value danger"}>{state.voltage_E1.toFixed(1)} кВ</span>
              </div>
              <button className="btn btn-primary" style={{margin: 0}} onClick={() => cmd('restore_voltage')} disabled={state.water_level_E1 >= 80}>ВОССТАНОВИТЬ 4.8 кВ</button>
            </div>
            
            <div className="prop-item">
              <div className="prop-header">
                <span>Дренаж воды:</span>
                <span className="tag-value">{state.valve_drain_E1.toFixed(1)} %</span>
              </div>
              <RangeSlider value={state.valve_drain_E1} onChange={v => cmd('set_drain_e1', v)} disabled={false} />
            </div>

            <div className="prop-item">
              <div className="prop-header">
                <span>Деэмульгатор:</span>
                <span className="tag-value">{state.demulsifier_feed.toFixed(1)} кг/ч</span>
              </div>
              <RangeSlider value={state.demulsifier_feed} onChange={v => cmd('set_demulsifier', v)} disabled={false} />
            </div>
          </div>)}

          {activePanel === 'fcv' && (<div>
            <div className="prop-item">
              <div className="prop-header">
                <span>Открытие клапана:</span>
                <span className="tag-value">{state.valve_feed.toFixed(1)} %</span>
              </div>
              <RangeSlider value={state.valve_feed} onChange={v => cmd('set_feed_valve', v)} disabled={false} />
            </div>
          </div>)}

          {activePanel === 'k1' && (<div>
            <div className="prop-item">
              <div className="prop-header">
                <span>УРОВЕНЬ:</span>
                <span className={state.level_K1 >= 90 ? 'tag-value danger' : getC(state.level_K1, 20, 10, true)}>{state.level_K1.toFixed(1)} %</span>
              </div>
              <div className="prop-header">
                <span>ДАВЛЕНИЕ:</span>
                <span className={getC(state.pressure_K1, 4.0, 4.5)}>{state.pressure_K1.toFixed(2)} кгс</span>
              </div>
              <div className="prop-header">
                <span>ТЕМП. ВЕРХ:</span>
                <span className={getC(state.temp_top_K1, 145, 150)}>{state.temp_top_K1.toFixed(1)} °C</span>
              </div>
            </div>
          </div>)}

          {activePanel === 'pcv' && (<div>
            {state.pcv_stuck && <div className="alert-box">КЛАПАН ЗАКЛИНИЛ!</div>}
            <div className="prop-item">
              <div className="prop-header">
                <span>Сброс газа:</span>
                <span className="tag-value">{state.pcv_221.toFixed(1)} %</span>
              </div>
              <RangeSlider value={state.pcv_221} onChange={v => cmd('set_pcv', v)} disabled={state.pcv_stuck} />
            </div>
          </div>)}

          {activePanel === 'avz' && (<div>
            {state.avz_broken && <div className="alert-box">ОТКАЗ ДВИГАТЕЛЯ!</div>}
            <div className="prop-item">
              <div className="prop-header">
                <span>Обороты вентилятора:</span>
                <span className="tag-value">{state.avz_1.toFixed(0)} %</span>
              </div>
              <RangeSlider value={state.avz_1} onChange={v => cmd('set_avz', v)} disabled={state.avz_broken} />
            </div>
          </div>)}

          {activePanel === 'h3' && (<div>
            <div className="prop-item">
              <div className="prop-header">
                <span>Состояние:</span>
                <span className={state.pump_H3 ? "tag-value ok" : "tag-value danger"}>{state.pump_H3 ? 'РАБОТА' : 'СТОП'}</span>
              </div>
              <div className="mode-toggle">
                <button className={`mode-btn auto ${state.pump_H3 ? 'active' : ''}`} onClick={() => cmd('set_pump_h3', 1)}>ПУСК</button>
                <button className={`mode-btn off ${!state.pump_H3 ? 'active' : ''}`} onClick={() => cmd('set_pump_h3', 0)}>СТОП</button>
              </div>
            </div>
          </div>)}

          {activePanel === 'trc3' && (<div>
            {state.gas_stuck && <div className="alert-box">КЛАПАН ЗАКЛИНИЛ НА 100%!</div>}
            
            <div className="prop-item">
              <div className="prop-header">
                <span>Режим работы:</span>
                <span className={state.TRC3_mode === 'AUTO' ? "tag-value ok" : "tag-value warn"}>{state.TRC3_mode === 'AUTO' ? 'АВТО' : 'РУЧНОЙ'}</span>
              </div>
              <div className="mode-toggle">
                <button className={`mode-btn auto ${state.TRC3_mode === 'AUTO' ? 'active' : ''}`} onClick={() => cmd('set_trc3_mode', 1)}>АВТО</button>
                <button className={`mode-btn manual ${state.TRC3_mode === 'MANUAL' ? 'active' : ''}`} onClick={() => cmd('set_trc3_mode', 0)}>РУЧНОЙ</button>
              </div>
            </div>
            
            <div className="prop-item">
              <div className="prop-header">
                <span>Температура:</span>
                <span className={getC(state.temp_P3, 340, 360)}>{state.temp_P3.toFixed(1)} °C</span>
              </div>
            </div>

            <div className="prop-item">
              <div className="prop-header">
                <span>Подача газа:</span>
                <span className="tag-value">{state.valve_gas.toFixed(1)} %</span>
              </div>
              <RangeSlider value={state.valve_gas} onChange={v => cmd('set_gas_valve', v)} disabled={state.TRC3_mode === 'AUTO' || state.gas_stuck} />
            </div>
          </div>)}

          {activePanel === 'k2' && (<div>
            <div className="prop-item">
              <div className="prop-header">
                <span>УРОВЕНЬ:</span>
                <span className={state.level_K2 >= 90 ? 'tag-value danger' : getC(state.level_K2, 20, 10, true)}>{state.level_K2.toFixed(1)} %</span>
              </div>
              <div className="prop-header">
                <span>ДАВЛЕНИЕ:</span>
                <span className={getC(state.pressure_K2, 1.8, 2.5)}>{state.pressure_K2.toFixed(2)} кгс</span>
              </div>
              <div className="prop-header">
                <span>ТЕМП. КУБ:</span>
                <span className="tag-value ok">{state.temp_K2.toFixed(1)} °C</span>
              </div>
            </div>
          </div>)}

          {activePanel === 'h2' && (<div>
            <div className="prop-item">
              <div className="prop-header">
                <span>Состояние:</span>
                <span className={state.pump_H2 ? "tag-value ok" : "tag-value danger"}>{state.pump_H2 ? 'РАБОТА' : 'СТОП'}</span>
              </div>
              <div className="mode-toggle">
                <button className={`mode-btn auto ${state.pump_H2 ? 'active' : ''}`} onClick={() => cmd('set_pump_h2', 1)}>ПУСК</button>
                <button className={`mode-btn off ${!state.pump_H2 ? 'active' : ''}`} onClick={() => cmd('set_pump_h2', 0)}>СТОП</button>
              </div>
            </div>
          </div>)}
        </div>
      </div>

      <div className="glass-panel ai-area">
        <div className="panel-title">ПОДСКАЗКИ ИИ</div>
        <div className="ai-bubble">{aiMessage}</div>
      </div>

      <div className="glass-panel instructor-area">
        <div className="panel-title">СЦЕНАРИИ (ИНСТРУКТОР)</div>
        <div className="inst-grid">
          <button className="btn btn-danger" onClick={() => {cmd('break_pump_h1'); setAiMessage("Отказ Н-1. Падает уровень в аппаратах. Будьте готовы остановить Н-3 и Н-2!");}}>Отказ Н-1</button>
          <button className="btn btn-danger" onClick={() => {cmd('short_circuit'); setAiMessage("Переполнение Э-1 водой привело к короткому замыканию! Слейте воду через дренаж и восстановите напряжение.");}}>Замыкание Э-1</button>
          <button className="btn btn-danger" onClick={() => {cmd('demulsifier_fail'); setAiMessage("Отключена подача деэмульгатора. Вода пошла в колонну К-1. Ожидается скачок давления!");}}>Потеря деэмульгатора</button>
          <button className="btn btn-danger" onClick={() => {cmd('jam_pcv'); setAiMessage("Клапан PCV-221 заклинил (сброса нет)! Давление растет. Экстренно гасите печь П-3 (TRC-3 в ручной и 0%), иначе ВЗРЫВ!");}}>Заклинить PCV</button>
          <button className="btn btn-warning" onClick={() => {cmd('jam_gas'); setAiMessage("Клапан газа печи заклинил на 100%. ПИД отключен. Срочно увеличьте подачу сырья на 100% для съема тепла!");}}>Заклинить газ</button>
          <button className="btn btn-danger" onClick={() => {cmd('gas_loss'); setAiMessage("Обрыв топливного газа! Печь погасла. Переведите TRC-3 в ручной режим и перекройте клапан.");}}>Обрыв пламени</button>
          <button className="btn btn-warning" onClick={() => {cmd('water_slug'); setAiMessage("В нефть попала вода с ЭЛОУ! Резкое вскипание в печи. Откройте сброс PCV-221 на факел!");}}>Вода с ЭЛОУ</button>
          <button className="btn btn-warning" onClick={() => {cmd('break_avz'); setAiMessage("Отказ кулера АВЗ-1! Температура верха колонны К-1 критически растет. Снизьте нагрузку на печь.");}}>Отказ АВЗ-1</button>
        </div>
        <button className="btn btn-success" style={{marginTop: 'auto'}} onClick={resetSimulation}>СБРОСИТЬ УСТАНОВКУ</button>
      </div>

      <div className="glass-panel alarms-area">
        <div className="panel-title">ЖУРНАЛ ТРЕВОГ </div>
        <ul className="alarms-list">
          {alarmsList.length === 0 ? <li style={{ color: '#475569', fontSize: 12 }}>Активных тревог нет</li> : (
            alarmsList.map(a => (
              <li key={a.id} className={`alarm-item ${!a.ack ? 'unacked' : ''}`} onClick={() => ackAlarm(a.id)}>
                <span className="alarm-time">{a.time}</span>{a.text}
              </li>
            ))
          )}
        </ul>
      </div>

    </div>
  );
}

export default App;