import React from 'react';

/**
 * Мнемосхема АСУ ТП ЭЛОУ-АВТ-4
 * Содержит: трубопроводы (SVG), оборудование, клапаны, терминалы.
 * Все интерактивные плашки с показателями и кликами — здесь.
 * Остальные панели (свойства, тревоги, инструктор) живут в App.jsx.
 */
export default function ScadaScheme({
  state,
  zoom,
  pan,
  onEquipmentClick,
  getPumpClass,
  getPumpText,
  getC,
}) {
  return (
    <div
      className="scada-canvas"
      style={{
        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        transformOrigin: '0 0',
      }}
    >
      <svg className="svg-layer" viewBox="0 0 2200 1200" width="2200" height="1200">
        {/* Н-1 to Э-1 */}
        <path d="M 300 700 L 450 700" className="svg-pipe-bg" />
        {state.pump_H1 && <path d="M 300 700 L 450 700" className="svg-pipe-flow" />}

        {/* Э-1 to K-1 */}
        <path d="M 650 700 L 860 700 Q 880 700 880 680 L 880 620 Q 880 600 900 600" className="svg-pipe-bg" />
        {state.pump_H1 && state.valve_feed > 0 && (
          <path d="M 650 700 L 860 700 Q 880 700 880 680 L 880 620 Q 880 600 900 600" className="svg-pipe-flow" />
        )}

        {/* K-1 top to PCV / Flare */}
        <path d="M 1000 510 L 1000 120" className="svg-pipe-bg" />
        {state.pcv_221 > 0 && <path d="M 1000 510 L 1000 120" className="svg-pipe-flow flare" />}

        {/* K-1 top to AVZ */}
        <path d="M 1000 420 Q 1000 400 1020 400 L 1200 400" className="svg-pipe-bg" />
        {!state.avz_broken && (
          <path d="M 1000 420 Q 1000 400 1020 400 L 1200 400" className="svg-pipe-flow gas" />
        )}

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
        {state.pump_H3 && (
          <path d="M 1500 900 L 1660 900 Q 1680 900 1680 880 L 1680 620 Q 1680 600 1700 600" className="svg-pipe-flow" />
        )}

        {/* K-2 bottom to H-2 */}
        <path d="M 1800 690 L 1800 860" className="svg-pipe-bg" />
        {state.pump_H2 && <path d="M 1800 690 L 1800 860" className="svg-pipe-flow" />}

        {/* H-2 to product storage */}
        <path d="M 1900 900 L 2050 900" className="svg-pipe-bg" />
        {state.pump_H2 && <path d="M 1900 900 L 2050 900" className="svg-pipe-flow" />}
      </svg>

      {/* Терминалы */}
      <div className="terminal-node" style={{ left: 1000, top: 100 }}>
        ФАКЕЛЬНАЯ
        <br />
        СЕТЬ
      </div>
      <div className="terminal-node" style={{ left: 1550, top: 400 }}>
        ЕМКОСТЬ
        <br />
        Е-2
      </div>
      <div className="terminal-node" style={{ left: 1400, top: 650 }}>
        ТОПЛИВНАЯ
        <br />
        СЕТЬ
      </div>
      <div className="terminal-node" style={{ left: 2100, top: 900 }}>
        ТОВАРНЫЙ
        <br />
        ПАРК
      </div>

      {/* Н-1 */}
      <div
        className={`equipment-node ${!state.pump_H1 || state.vib_H1 > 5.0 ? 'alarm' : 'active'}`}
        style={{ left: 200, top: 700 }}
        onClick={() => onEquipmentClick('h1')}
      >
        <div className="eq-header">Сырьевой Н-1</div>
        <div className="eq-body">
          <div className="tag-row">
            <span className="tag-name">Статус</span>
            <span className={getPumpClass(state.pump_H1, state.vib_H1)}>
              {getPumpText(state.pump_H1, state.vib_H1)}
            </span>
          </div>
          <div className="tag-row">
            <span className="tag-name">Расход</span>
            <span className="tag-value ok">{state.flow_in?.toFixed(1)} т/ч</span>
          </div>
        </div>
      </div>

      {/* Э-1 */}
      <div
        className={`equipment-node ${state.voltage_E1 === 0 ? 'alarm' : 'active'}`}
        style={{ left: 550, top: 700 }}
        onClick={() => onEquipmentClick('e1')}
      >
        <div className="eq-header">Электродегидратор Э-1</div>
        <div className="eq-body">
          <div className="tag-row">
            <span className="tag-name">Напряжение</span>
            <span className={state.voltage_E1 > 0 ? 'tag-value ok' : 'tag-value danger'}>
              {state.voltage_E1.toFixed(1)} кВ
            </span>
          </div>
          <div className="tag-row">
            <span className="tag-name">Уровень Воды</span>
            <span className={state.water_level_E1 > 70 ? 'tag-value danger' : 'tag-value ok'}>
              {state.water_level_E1.toFixed(1)} %
            </span>
          </div>
          <div className="tag-row">
            <span className="tag-name">Деэмульгатор</span>
            <span className={state.demulsifier_feed < 10 ? 'tag-value danger' : 'tag-value ok'}>
              {state.demulsifier_feed.toFixed(1)} кг/ч
            </span>
          </div>
        </div>
      </div>

      {/* FCV-1 */}
      <div className="valve-wrapper" style={{ left: 750, top: 700 }} onClick={() => onEquipmentClick('fcv')}>
        <span className="valve-label">FCV-1</span>
        <svg className={`valve-bowtie ${state.valve_feed > 0 ? 'active' : ''}`} width="36" height="24" viewBox="0 0 32 24">
          <polygon points="2,8 2,22 16,15" />
          <polygon points="30,8 30,22 16,15" />
          <rect x="12" y="2" width="8" height="6" fill="currentColor" stroke="currentColor" />
          <path d="M16 8 v7" stroke="currentColor" strokeWidth="2" />
        </svg>
      </div>

      {/* К-1 */}
      <div
        className={`equipment-node ${state.pressure_K1 >= 4.5 || state.level_K1 >= 95 ? 'alarm' : 'active'}`}
        style={{ left: 1000, top: 600, height: 180 }}
        onClick={() => onEquipmentClick('k1')}
      >
        <div className="eq-header">Колонна К-1</div>
        <div className="eq-body" style={{ justifyContent: 'center' }}>
          <div className="tag-row">
            <span className="tag-name">Давление</span>
            <span className={getC(state.pressure_K1, 4.0, 4.5)}>{state.pressure_K1.toFixed(2)} кгс</span>
          </div>
          <div className="tag-row">
            <span className="tag-name">Темп. Верха</span>
            <span className={getC(state.temp_top_K1, 145, 150)}>{state.temp_top_K1.toFixed(1)} °C</span>
          </div>
          <div style={{ height: 15 }} />
          <div className="tag-row">
            <span className="tag-name">УРОВЕНЬ</span>
            <span className={state.level_K1 >= 90 ? 'tag-value danger' : getC(state.level_K1, 20, 10, true)}>
              {state.level_K1.toFixed(1)} %
            </span>
          </div>
          <div className="mini-bar">
            <div
              className="mini-bar-fill"
              style={{
                width: `${state.level_K1}%`,
                background: state.level_K1 > 90 || state.level_K1 < 10 ? '#ef4444' : '#38bdf8',
              }}
            />
          </div>
        </div>
      </div>

      {/* PCV-221 */}
      <div className="valve-wrapper" style={{ left: 1000, top: 250 }} onClick={() => onEquipmentClick('pcv')}>
        <span className="valve-label">PCV-221 (Факел)</span>
        <svg
          className={`valve-bowtie ${state.pcv_stuck ? 'alarm' : state.pcv_221 > 0 ? 'active' : ''}`}
          width="36"
          height="24"
          viewBox="0 0 32 24"
        >
          <polygon points="2,8 2,22 16,15" />
          <polygon points="30,8 30,22 16,15" />
          <rect x="12" y="2" width="8" height="6" fill="currentColor" stroke="currentColor" />
          <path d="M16 8 v7" stroke="currentColor" strokeWidth="2" />
        </svg>
      </div>

      {/* АВЗ-1 */}
      <div
        className={`equipment-node ${state.avz_broken ? 'alarm' : 'active'}`}
        style={{ left: 1300, top: 400 }}
        onClick={() => onEquipmentClick('avz')}
      >
        <div className="eq-header">АВЗ-1 (Охлаждение)</div>
        <div className="eq-body">
          <div className="tag-row">
            <span className="tag-name">Обороты</span>
            <span className={state.avz_broken ? 'tag-value danger' : 'tag-value ok'}>
              {state.avz_1.toFixed(0)} %
            </span>
          </div>
          <div className="mini-bar">
            <div className="mini-bar-fill" style={{ width: `${state.avz_1}%`, background: '#38bdf8' }} />
          </div>
        </div>
      </div>

      {/* Н-3 */}
      <div
        className={`equipment-node ${!state.pump_H3 || state.vib_H3 > 5.0 ? 'alarm' : 'active'}`}
        style={{ left: 1000, top: 900 }}
        onClick={() => onEquipmentClick('h3')}
      >
        <div className="eq-header">Насос Н-3 (Куб К-1)</div>
        <div className="eq-body">
          <div className="tag-row">
            <span className="tag-name">Статус</span>
            <span className={getPumpClass(state.pump_H3, state.vib_H3)}>
              {getPumpText(state.pump_H3, state.vib_H3)}
            </span>
          </div>
        </div>
      </div>

      {/* Печь П-3 */}
      <div
        className={`equipment-node ${state.temp_P3 > 350 ? 'alarm' : 'active'}`}
        style={{ left: 1400, top: 900 }}
        onClick={() => onEquipmentClick('trc3')}
      >
        <div className="eq-header">Печь П-3</div>
        <div className="eq-body">
          <div className="tag-row">
            <span className="tag-name">ТЕМП.</span>
            <span className={getC(state.temp_P3, 340, 360)}>{state.temp_P3.toFixed(1)} °C</span>
          </div>
          <div className="tag-row">
            <span className="tag-name">ГАЗ</span>
            <span className="tag-value ok">{state.valve_gas.toFixed(1)} %</span>
          </div>
          <div className="mini-bar">
            <div
              className="mini-bar-fill"
              style={{
                width: `${state.valve_gas}%`,
                background: state.gas_stuck ? '#ef4444' : '#f59e0b',
              }}
            />
          </div>
        </div>
      </div>

      {/* TRC-3 клапан */}
      <div className="valve-wrapper" style={{ left: 1400, top: 750 }} onClick={() => onEquipmentClick('trc3')}>
        <span className="valve-label">TRC-3 Газ</span>
        <svg
          className={`valve-bowtie ${state.gas_stuck ? 'alarm' : state.valve_gas > 0 ? 'active' : ''}`}
          width="36"
          height="24"
          viewBox="0 0 32 24"
        >
          <polygon points="2,8 2,22 16,15" />
          <polygon points="30,8 30,22 16,15" />
          <rect x="12" y="2" width="8" height="6" fill="currentColor" stroke="currentColor" />
          <path d="M16 8 v7" stroke="currentColor" strokeWidth="2" />
        </svg>
      </div>

      {/* К-2 */}
      <div
        className={`equipment-node ${state.level_K2 >= 95 ? 'alarm' : 'active'}`}
        style={{ left: 1800, top: 600, height: 180 }}
        onClick={() => onEquipmentClick('k2')}
      >
        <div className="eq-header">Колонна К-2</div>
        <div className="eq-body" style={{ justifyContent: 'center' }}>
          <div className="tag-row">
            <span className="tag-name">Давление</span>
            <span className={getC(state.pressure_K2, 1.8, 2.5)}>{state.pressure_K2.toFixed(2)} кгс</span>
          </div>
          <div className="tag-row">
            <span className="tag-name">Темп. Куб</span>
            <span className="tag-value ok">{state.temp_K2.toFixed(1)} °C</span>
          </div>
          <div style={{ height: 15 }} />
          <div className="tag-row">
            <span className="tag-name">УРОВЕНЬ</span>
            <span className={state.level_K2 >= 90 ? 'tag-value danger' : getC(state.level_K2, 20, 10, true)}>
              {state.level_K2.toFixed(1)} %
            </span>
          </div>
          <div className="mini-bar">
            <div
              className="mini-bar-fill"
              style={{
                width: `${state.level_K2}%`,
                background: state.level_K2 > 90 || state.level_K2 < 10 ? '#ef4444' : '#38bdf8',
              }}
            />
          </div>
        </div>
      </div>

      {/* Н-2 */}
      <div
        className={`equipment-node ${!state.pump_H2 || state.vib_H2 > 5.0 ? 'alarm' : 'active'}`}
        style={{ left: 1800, top: 900 }}
        onClick={() => onEquipmentClick('h2')}
      >
        <div className="eq-header">Печной Н-2</div>
        <div className="eq-body">
          <div className="tag-row">
            <span className="tag-name">Статус</span>
            <span className={getPumpClass(state.pump_H2, state.vib_H2)}>
              {getPumpText(state.pump_H2, state.vib_H2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}