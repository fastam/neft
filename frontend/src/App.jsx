import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = "http://127.0.0.1:8000/api";

function App() {
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  
  const [state, setState] = useState({
    exploded: false, score: 100, alarms: [],
    pump_H1: true, valve_feed: 80.0, flow_in: 120.0,
    level_K1: 50.0, pressure_K1: 2.5, temp_top_K1: 140.0,
    pump_H2: true, flow_out: 120.0,
    TRC3_mode: "AUTO", valve_gas: 83.5, temp_P3: 335.0,
    pcv_221: 40.0, avz_1: 80.0,
    avz_broken: false, pcv_stuck: false, gas_stuck: false
  });

  const [alarmsList, setAlarmsList] = useState([]);
  const [activePanel, setActivePanel] = useState(null);
  const [aiMessage, setAiMessage] = useState("ИИ-Помощник активен. Тренажер работает в штатном режиме. Кликните на любой аппарат, чтобы открыть панель свойств.");

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
      } catch (e) {
      }
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
    } catch (e) {
    }
  };
  
  const resetSimulation = async () => { 
    try {
      await fetch(`${API_URL}/reset`, { method: "POST" }); 
      setAlarmsList([]); 
      setActivePanel(null); 
      setAiMessage("Симуляция сброшена. Установка возвращена к нормальным параметрам."); 
    } catch (e) {
    }
  };

  const ackAlarm = (id) => setAlarmsList(alarmsList.map(a => a.id === id ? { ...a, ack: true } : a));

  const getC = (val, warn, danger, isInverse=false) => {
    if (isInverse) return val <= danger ? 'tag-value danger' : val <= warn ? 'tag-value warn' : 'tag-value ok';
    return val >= danger ? 'tag-value danger' : val >= warn ? 'tag-value warn' : 'tag-value ok';
  };

  if (state.exploded) return (
    <div className="explosion-overlay">
      <div className="explosion-text">💥 ВЗРЫВ КОЛОННЫ К-1 💥</div>
      <p style={{color: '#fff', fontSize: 24, marginBottom: 30}}>Критическое превышение давления. Аппарат разрушен.</p>
      <button className="btn btn-success" style={{width: 300, fontSize: 16}} onClick={resetSimulation}>ПЕРЕЗАПУСК ТРЕНАЖЕРА</button>
    </div>
  );

  return (
    <div className="dashboard-layout">
      
      <header className="top-header glass-panel" style={{flexDirection: 'row', padding: '0 24px'}}>
        <div className="brand">
          <h1>КТК: ЭЛОУ-АВТ-4</h1><div className="divider"></div><span>Полномасштабный Тренажер</span>
        </div>
        <div className="sys-info">
          <div className="sys-item"><span className="label">СКОРОСТЬ:</span><span>1.0x</span></div>
          <div className="sys-item"><span className="label">СВЯЗЬ:</span><span className="led green"></span><span>ОНЛАЙН</span></div>
          <div className="sys-item"><span>{time}</span></div>
          <div className="score-badge">ОЦЕНКА: {state.score}/100</div>
        </div>
      </header>

      <div className="scada-area">
        <div className="panel-title" style={{position:'absolute', top: 16, left: 16, zIndex: 10, background: '#0f172a', padding: '4px 8px', borderRadius: 4, border: '1px solid #334155'}}>МНЕМОСХЕМА АСУ ТП</div>
        
        <svg className="svg-layer" viewBox="0 0 1000 1000" preserveAspectRatio="none">
          <path d="M 150 700 L 400 700" className="svg-pipe-bg" />
          {state.pump_H1 && <path d="M 150 700 L 400 700" className="svg-pipe-flow" />}
          
          <path d="M 400 550 L 400 150" className="svg-pipe-bg" />
          {state.pcv_221 > 0 && <path d="M 400 550 L 400 150" className="svg-pipe-flow flare" />}
          
          <path d="M 400 550 L 400 250 Q 400 220 430 220 L 700 220" className="svg-pipe-bg" />
          {!state.avz_broken && <path d="M 400 550 L 400 250 Q 400 220 430 220 L 700 220" className="svg-pipe-flow gas" />}

          <path d="M 400 650 L 400 870 Q 400 900 430 900 L 620 900 Q 650 900 650 870 L 650 750" className="svg-pipe-bg" />
          {state.pump_H2 && <path d="M 400 650 L 400 870 Q 400 900 430 900 L 620 900 Q 650 900 650 870 L 650 750" className="svg-pipe-flow" />}

          <path d="M 650 750 L 900 750" className="svg-pipe-bg" />
          {state.pump_H2 && <path d="M 650 750 L 900 750" className="svg-pipe-flow" />}
        </svg>

        <div className={`equipment-node ${!state.pump_H1 ? 'alarm' : 'active'}`} style={{left: '15%', top: '70%'}} onClick={() => setActivePanel('h1')}>
          <div className="eq-header">Сырьевой Н-1</div>
          <div className="eq-body">
            <div className="tag-row"><span className="tag-name">Статус</span><span className={state.pump_H1 ? "tag-value ok" : "tag-value danger"}>{state.pump_H1 ? 'РАБОТА' : 'СТОП'}</span></div>
            <div className="tag-row"><span className="tag-name">Расход (FRC 404)</span><span className="tag-value ok">{state.flow_in.toFixed(1)} т/ч</span></div>
          </div>
        </div>

        <div className="valve-wrapper" style={{left: '27.5%', top: '70%'}} onClick={() => setActivePanel('fcv')}>
          <span className="valve-label">FCV-1</span>
          <svg className={`valve-bowtie ${state.valve_feed > 0 ? 'active' : ''}`} width="36" height="24" viewBox="0 0 32 24">
            <polygon points="2,8 2,22 16,15" /><polygon points="30,8 30,22 16,15" /><rect x="12" y="2" width="8" height="6" fill="currentColor" stroke="currentColor" /><path d="M16 8 v7" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>

        <div className={`equipment-node ${state.pressure_K1 >= 4.5 ? 'alarm' : 'active'}`} style={{left: '40%', top: '60%', height: 180}} onClick={() => setActivePanel('k1')}>
          <div className="eq-header">Колонна К-1</div>
          <div className="eq-body" style={{justifyContent: 'center'}}>
            <div className="tag-row"><span className="tag-name">Давление</span><span className={getC(state.pressure_K1, 4.0, 4.5)}>{state.pressure_K1.toFixed(2)} кгс</span></div>
            <div className="tag-row"><span className="tag-name">Темп. Верха</span><span className={getC(state.temp_top_K1, 145, 150)}>{state.temp_top_K1.toFixed(1)} °C</span></div>
            <div style={{height: 15}}></div>
            <div className="tag-row"><span className="tag-name">УРОВЕНЬ</span><span className={getC(state.level_K1, 20, 10, true)}>{state.level_K1.toFixed(1)} %</span></div>
            <div className="mini-bar"><div className="mini-bar-fill" style={{ width: `${state.level_K1}%`, background: state.level_K1>90||state.level_K1<10 ? '#ef4444':'#38bdf8' }}></div></div>
          </div>
        </div>

        <div className="valve-wrapper" style={{left: '40%', top: '15%'}} onClick={() => setActivePanel('pcv')}>
          <span className="valve-label">PCV-221 (Факел)</span>
          <svg className={`valve-bowtie ${state.pcv_stuck ? 'alarm' : state.pcv_221 > 0 ? 'active' : ''}`} width="36" height="24" viewBox="0 0 32 24">
            <polygon points="2,8 2,22 16,15" /><polygon points="30,8 30,22 16,15" /><rect x="12" y="2" width="8" height="6" fill="currentColor" stroke="currentColor" /><path d="M16 8 v7" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>

        <div className={`equipment-node ${state.avz_broken ? 'alarm' : 'active'}`} style={{left: '70%', top: '22%'}} onClick={() => setActivePanel('avz')}>
          <div className="eq-header">АВЗ-1 (Охлаждение)</div>
          <div className="eq-body">
            <div className="tag-row"><span className="tag-name">Обороты кулера</span><span className={state.avz_broken?"tag-value danger":"tag-value ok"}>{state.avz_1.toFixed(0)} %</span></div>
            <div className="mini-bar"><div className="mini-bar-fill" style={{ width: `${state.avz_1}%`, background: '#38bdf8' }}></div></div>
          </div>
        </div>

        <div className={`equipment-node ${!state.pump_H2 ? 'alarm' : 'active'}`} style={{left: '65%', top: '75%'}} onClick={() => setActivePanel('h2')}>
          <div className="eq-header">Печной Н-2</div>
          <div className="eq-body">
            <div className="tag-row"><span className="tag-name">Статус</span><span className={state.pump_H2 ? "tag-value ok" : "tag-value danger"}>{state.pump_H2 ? 'РАБОТА' : 'СТОП'}</span></div>
          </div>
        </div>

        <div className="valve-wrapper" style={{left: '76.5%', top: '75%'}} onClick={() => setActivePanel('trc3')}>
          <span className="valve-label">TRC-3 Газ</span>
          <svg className={`valve-bowtie ${state.gas_stuck ? 'alarm' : state.valve_gas > 0 ? 'active' : ''}`} width="36" height="24" viewBox="0 0 32 24">
            <polygon points="2,8 2,22 16,15" /><polygon points="30,8 30,22 16,15" /><rect x="12" y="2" width="8" height="6" fill="currentColor" stroke="currentColor" /><path d="M16 8 v7" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>

        <div className={`equipment-node ${state.temp_P3 > 350 ? 'alarm' : 'active'}`} style={{left: '90%', top: '75%'}} onClick={() => setActivePanel('trc3')}>
          <div className="eq-header">Печь П-3</div>
          <div className="eq-body">
            <div className="tag-row"><span className="tag-name">ТЕМП.</span><span className={getC(state.temp_P3, 340, 360)}>{state.temp_P3.toFixed(1)} °C</span></div>
            <div className="tag-row"><span className="tag-name">ГАЗ</span><span className="tag-value ok">{state.valve_gas.toFixed(1)} %</span></div>
            <div className="mini-bar"><div className="mini-bar-fill" style={{ width: `${state.valve_gas}%`, background: state.gas_stuck?'#ef4444':'#f59e0b' }}></div></div>
          </div>
        </div>
      </div>

      <div className="glass-panel props-area">
        <div className="panel-title" style={{padding: '16px 16px 0'}}>ЛИЦЕВАЯ ПАНЕЛЬ</div>
        <div className="prop-body">
          {!activePanel && <div className="empty-props">Выберите объект на схеме</div>}

          {activePanel === 'h1' && (<div>
            <div className="prop-section-title">Сырьевой Насос Н-1</div>
            <div className="prop-row"><span>Состояние:</span><span className={state.pump_H1?"tag-value ok":"tag-value danger"}>{state.pump_H1?'ВКЛ':'ВЫКЛ'}</span></div>
            <button className="btn btn-success" onClick={() => cmd('set_pump_h1', 1)}>ПУСК</button>
            <button className="btn btn-danger" onClick={() => cmd('set_pump_h1', 0)}>СТОП</button>
          </div>)}

          {activePanel === 'fcv' && (<div>
            <div className="prop-section-title">Клапан сырья (FCV-1)</div>
            <div className="prop-row"><span>Позиция:</span><span>{state.valve_feed.toFixed(1)} %</span></div>
            <input type="range" className="prop-slider" min="0" max="100" value={state.valve_feed} onChange={e => cmd('set_feed_valve', parseFloat(e.target.value))} />
          </div>)}

          {activePanel === 'k1' && (<div>
            <div className="prop-section-title">Колонна К-1</div>
            <div className="prop-row"><span>УРОВЕНЬ:</span><span className={getC(state.level_K1, 20, 10, true)}>{state.level_K1.toFixed(1)} %</span></div>
            <div className="prop-row"><span>ДАВЛЕНИЕ:</span><span className={getC(state.pressure_K1, 4.0, 4.5)}>{state.pressure_K1.toFixed(2)} кгс</span></div>
            <div className="prop-row"><span>ТЕМП. ВЕРХ:</span><span className={getC(state.temp_top_K1, 145, 150)}>{state.temp_top_K1.toFixed(1)} °C</span></div>
            <p style={{fontSize: 11, color: '#94a3b8', marginTop: 20}}>Для снижения давления приоткройте клапан PCV-221. Для охлаждения верха увеличьте обороты АВЗ-1.</p>
          </div>)}

          {activePanel === 'pcv' && (<div>
            <div className="prop-section-title">Сброс на Факел (PCV-221)</div>
            {state.pcv_stuck && <div style={{background: '#ef4444', color: '#fff', padding: 8, borderRadius: 4, textAlign: 'center', marginBottom: 10, fontSize: 11}}>КЛАПАН ЗАКЛИНИЛ!</div>}
            <div className="prop-row"><span>Сброс газа:</span><span>{state.pcv_221.toFixed(1)} %</span></div>
            <input type="range" className="prop-slider" min="0" max="100" value={state.pcv_221} onChange={e => cmd('set_pcv', parseFloat(e.target.value))} disabled={state.pcv_stuck} />
          </div>)}

          {activePanel === 'avz' && (<div>
            <div className="prop-section-title">Аппарат Возд. Охлаждения АВЗ-1</div>
            {state.avz_broken && <div style={{background: '#ef4444', color: '#fff', padding: 8, borderRadius: 4, textAlign: 'center', marginBottom: 10, fontSize: 11}}>ОТКАЗ ДВИГАТЕЛЯ!</div>}
            <div className="prop-row"><span>Обороты:</span><span>{state.avz_1.toFixed(0)} %</span></div>
            <input type="range" className="prop-slider" min="0" max="100" value={state.avz_1} onChange={e => cmd('set_avz', parseFloat(e.target.value))} disabled={state.avz_broken} />
          </div>)}

          {activePanel === 'h2' && (<div>
            <div className="prop-section-title">Печной Насос Н-2</div>
            <div className="prop-row"><span>Состояние:</span><span className={state.pump_H2?"tag-value ok":"tag-value danger"}>{state.pump_H2?'ВКЛ':'ВЫКЛ'}</span></div>
            <button className="btn btn-success" onClick={() => cmd('set_pump_h2', 1)}>ПУСК</button>
            <button className="btn btn-danger" onClick={() => cmd('set_pump_h2', 0)}>СТОП</button>
          </div>)}

          {activePanel === 'trc3' && (<div>
            <div className="prop-section-title">Регулятор Печи П-3 (TRC-3)</div>
            {state.gas_stuck && <div style={{background: '#ef4444', color: '#fff', padding: 8, borderRadius: 4, textAlign: 'center', marginBottom: 10, fontSize: 11}}>КЛАПАН ЗАКЛИНИЛ НА 100%!</div>}
            <div className="mode-toggle" style={{marginBottom: 15}}>
              <button className={`mode-btn auto ${state.TRC3_mode === 'AUTO' ? 'active' : ''}`} onClick={() => cmd('set_trc3_mode', 1)}>АВТО</button>
              <button className={`mode-btn manual ${state.TRC3_mode === 'MANUAL' ? 'active' : ''}`} onClick={() => cmd('set_trc3_mode', 0)}>РУЧНОЙ</button>
            </div>
            <div className="prop-row"><span>Температура:</span><span className={getC(state.temp_P3, 340, 360)}>{state.temp_P3.toFixed(1)} °C</span></div>
            <div className="prop-row"><span>Газ:</span><span>{state.valve_gas.toFixed(1)} %</span></div>
            <input type="range" className="prop-slider" min="0" max="100" value={state.valve_gas} onChange={e => cmd('set_gas_valve', parseFloat(e.target.value))} disabled={state.TRC3_mode === 'AUTO' || state.gas_stuck} />
          </div>)}
        </div>
      </div>

      <div className="glass-panel ai-area">
        <div className="panel-title" style={{color: '#38bdf8'}}>ПОДСКАЗКИ ИИ</div>
        <div className="ai-bubble">{aiMessage}</div>
      </div>

      <div className="glass-panel diag-area">
        <div className="panel-title">СИСТЕМА КОМПАКС</div>
        <div className="diag-list">
          <div className="diag-item"><span><span className={`led ${state.pump_H1?'green':'red'}`}></span> Вибрация Н-1</span><span className="tag-value ok">2.1 мм/с</span></div>
          <div className="diag-item"><span><span className={`led ${state.pump_H2?'green':'red'}`}></span> Вибрация Н-2</span><span className="tag-value ok">1.8 мм/с</span></div>
        </div>
      </div>

      <div className="glass-panel instructor-area">
        <div className="panel-title">СЦЕНАРИИ (ИНСТРУКТОР)</div>
        <div className="inst-grid">
          <button className="btn btn-danger" onClick={() => {cmd('break_pump_h1'); setAiMessage("Отказ насоса Н-1. Падает уровень К-1. Запустите резерв (кликните на Н-1) или остановите Н-2!");}}>Отказ Н-1</button>
          <button className="btn btn-danger" onClick={() => {cmd('jam_pcv'); setAiMessage("Клапан PCV-221 заклинил! Давление растет. Экстренно гасите печь П-3 (TRC-3 в ручной режим и 0%), иначе ВЗРЫВ!");}}>Заклинить PCV (Взрыв)</button>
          <button className="btn btn-warning" onClick={() => {cmd('jam_gas'); setAiMessage("Клапан газа печи заклинил на 100%. ПИД отключен. Срочно увеличьте подачу сырья (FCV-1) на 100% для съема тепла!");}}>Заклинить газ на П-3</button>
          <button className="btn btn-warning" onClick={() => {cmd('break_avz'); setAiMessage("Отказ кулера АВЗ-1! Температура верха колонны К-1 критически растет.");}}>Отказ АВЗ-1</button>
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