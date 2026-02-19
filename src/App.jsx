import React, { useState, useEffect, useMemo } from 'react';
import { Beaker, Calculator, Microscope, RotateCcw, Droplets, FlaskConical, ChevronDown, ChevronUp, Save, Settings2, Grid3x3, List } from 'lucide-react';

// --- Componentes UI Extraidos ---

const GridCell = ({ label, data, active, onClick }) => {
  const total = data ? data.live + data.dead : 0;
  
  const baseClasses = "relative rounded-lg flex flex-col items-center justify-center p-2 transition-all duration-200 border-2";
  const activeClasses = "bg-slate-800 border-indigo-500 hover:bg-slate-700 cursor-pointer shadow-lg active:scale-95";
  const inactiveClasses = "bg-slate-900/50 border-slate-800 opacity-30 pointer-events-none";

  if (!active) {
    return <div className={`${baseClasses} ${inactiveClasses}`}></div>;
  }

  return (
    <div onClick={onClick} className={`${baseClasses} ${activeClasses}`}>
      <span className="text-xs font-bold text-slate-400 absolute top-1 left-2">{label}</span>
      {total > 0 ? (
        <div className="flex flex-col items-center">
          <span className="text-2xl font-bold text-white">{total}</span>
          <div className="flex gap-1 mt-1">
            <span className="text-[10px] text-green-400 font-mono">V:{data.live}</span>
            <span className="text-[10px] text-red-400 font-mono">M:{data.dead}</span>
          </div>
        </div>
      ) : (
        <span className="text-sm text-indigo-400 font-medium">Contar</span>
      )}
    </div>
  );
};

const CountingModal = ({ activeCell, counts, updateCount, handleDirectInput, onClose }) => {
  if (!activeCell) return null;
  const data = counts[activeCell.key];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
      {/* Header Modal */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
        <h3 className="text-xl font-bold text-white">{activeCell.label}</h3>
        <button 
          onClick={onClose}
          className="px-4 py-2 bg-slate-800 text-white rounded-lg font-medium"
        >
          Listo
        </button>
      </div>

      {/* Contadores */}
      <div className="flex-1 flex flex-col gap-4 p-4 justify-center">
        
        {/* VIVAS */}
        <div className="flex-1 bg-slate-900 rounded-2xl border border-green-900/50 p-4 flex flex-col items-center justify-between">
          <span className="text-green-400 font-bold uppercase tracking-wider">Celulas Vivas</span>
          <input 
            type="number" 
            value={data.live === 0 ? '' : data.live} 
            placeholder="0"
            onChange={(e) => handleDirectInput(activeCell.key, 'live', e.target.value)}
            className="w-full bg-transparent text-center text-6xl font-mono text-white font-bold outline-none border-b-2 border-transparent focus:border-green-500/50 transition-all mb-2"
          />
          <div className="flex w-full gap-4">
            <button 
              onClick={() => updateCount(activeCell.key, 'live', -1)}
              className="flex-1 py-4 bg-slate-800 rounded-xl text-red-400 text-2xl font-bold active:bg-slate-700"
            >
              -
            </button>
            <button 
              onClick={() => updateCount(activeCell.key, 'live', 1)}
              className="flex-[2] py-4 bg-green-600 rounded-xl text-white text-4xl font-bold shadow-lg active:bg-green-700 active:scale-95 transition-transform"
            >
              +
            </button>
          </div>
        </div>

        {/* MUERTAS */}
        <div className="flex-1 bg-slate-900 rounded-2xl border border-red-900/50 p-4 flex flex-col items-center justify-between">
          <span className="text-red-400 font-bold uppercase tracking-wider">Celulas Muertas (Tenidas)</span>
          <input 
            type="number" 
            value={data.dead === 0 ? '' : data.dead} 
            placeholder="0"
            onChange={(e) => handleDirectInput(activeCell.key, 'dead', e.target.value)}
            className="w-full bg-transparent text-center text-6xl font-mono text-white font-bold outline-none border-b-2 border-transparent focus:border-red-500/50 transition-all mb-2"
          />
          <div className="flex w-full gap-4">
            <button 
              onClick={() => updateCount(activeCell.key, 'dead', -1)}
              className="flex-1 py-4 bg-slate-800 rounded-xl text-red-400 text-2xl font-bold active:bg-slate-700"
            >
              -
            </button>
            <button 
              onClick={() => updateCount(activeCell.key, 'dead', 1)}
              className="flex-[2] py-4 bg-red-600 rounded-xl text-white text-4xl font-bold shadow-lg active:bg-red-700 active:scale-95 transition-transform"
            >
              +
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};


// --- App Principal ---

const App = () => {
  // --- Estados ---
  
  // Configuracion de Dilucion (Volumenes en mL)
  const [volumes, setVolumes] = useState({
    sample: 1,      // Volumen de muestra inicial
    water: 9,       // Volumen de agua/buffer anadido (Default Cuba 1:10)
    aliquot: 1,     // Volumen de la dilucion tomado para tenir
    stain: 1        // Volumen de tincion anadido
  });

  // Modo de conteo: 5 cuadros (Standard Z) o 13 cuadros (Baja densidad)
  const [countingMode, setCountingMode] = useState(5); // 5 or 13

  // Estado del conteo DETALLADO (para modo 5 cuadros)
  const [counts, setCounts] = useState({
    tl: { live: 0, dead: 0 },
    tr: { live: 0, dead: 0 },
    c:  { live: 0, dead: 0 },
    bl: { live: 0, dead: 0 },
    br: { live: 0, dead: 0 },
  });

  // Estado del conteo GLOBAL (para modo 13 cuadros)
  const [globalCounts, setGlobalCounts] = useState({
    live: 0, 
    dead: 0 
  });

  // Estado para el modal de conteo
  const [activeCell, setActiveCell] = useState(null);
  
  // Estado para colapsar seccion de dilucion
  const [showDilution, setShowDilution] = useState(true);

  // --- Calculos ---

  const dilutionFactor = useMemo(() => {
    const vSample = parseFloat(volumes.sample) || 0;
    const vWater = parseFloat(volumes.water) || 0;
    const vAliquot = parseFloat(volumes.aliquot) || 0;
    const vStain = parseFloat(volumes.stain) || 0;

    if (vSample === 0 || vAliquot === 0) return 1;

    // Paso 1: Dilucion inicial (Muestra + Agua)
    const df1 = (vSample + vWater) / vSample;
    
    // Paso 2: Tincion (Alicuota + Tinte)
    // NOTA: Esto corresponde al "x2" de la formula cuando es 1:1
    const df2 = (vAliquot + vStain) / vAliquot;

    return df1 * df2;
  }, [volumes]);

  // Totales unificados segun el modo
  const totals = useMemo(() => {
    if (countingMode === 5) {
      const cells = Object.values(counts);
      const totalLive = cells.reduce((acc, curr) => acc + curr.live, 0);
      const totalDead = cells.reduce((acc, curr) => acc + curr.dead, 0);
      return { live: totalLive, dead: totalDead, all: totalLive + totalDead };
    } else {
      // Modo 13 cuadros
      return { 
        live: globalCounts.live, 
        dead: globalCounts.dead, 
        all: globalCounts.live + globalCounts.dead 
      };
    }
  }, [counts, globalCounts, countingMode]);

  const results = useMemo(() => {
    // Formula General: N = (n / Cuadros) * 25 * 10,000 * DF * (x2 incluido en DF)
    // El "x2" de la nota del usuario es la tincion 1:1, que ya esta calculada en dilutionFactor
    
    // Factor base por cuadro: 25 (total) * 10,000 (volumen) = 250,000
    // Factor de entrada: 250,000 / CuadrosLeidos
    const baseFactor = 250000 / countingMode; 
    
    // Multiplicador final para obtener millones/mL (divide por 1,000,000)
    // Multiplier = (250,000 / Cuadros) * DF / 1,000,000
    const multiplier = (baseFactor * dilutionFactor) / 1000000;
    
    const concLive = totals.live * multiplier;
    const concDead = totals.dead * multiplier;
    const concTotal = totals.all * multiplier;
    
    const viability = totals.all > 0 ? (totals.live / totals.all) * 100 : 0;

    return {
      concLive: concLive.toFixed(2),
      concDead: concDead.toFixed(2),
      concTotal: concTotal.toFixed(2),
      viability: viability.toFixed(1)
    };
  }, [totals, dilutionFactor, countingMode]);

  // --- Manejadores ---

  const handleVolumeChange = (field, value) => {
    setVolumes(prev => ({ ...prev, [field]: value }));
  };

  const applyPreset = (type) => {
    if (type === 'cuba') {
      // Dilucion 1:10 base + Tincion
      setVolumes(prev => ({ ...prev, sample: 1, water: 9, aliquot: 1, stain: 1 }));
      setCountingMode(5); // Por defecto cubas suele ser 5 si hay muchas
    } else if (type === 'fermentador') {
      // Dilucion 1:40 base + Tincion
      setVolumes(prev => ({ ...prev, sample: 1, water: 39, aliquot: 1, stain: 1 }));
      setCountingMode(5);
    }
  };

  const updateCount = (cellKey, type, delta) => {
    setCounts(prev => {
      const currentVal = prev[cellKey][type];
      const newVal = Math.max(0, currentVal + delta);
      return {
        ...prev,
        [cellKey]: { ...prev[cellKey], [type]: newVal }
      };
    });
  };

  const handleDirectInput = (cellKey, type, value) => {
    if (value === '') {
        setCounts(prev => ({
            ...prev,
            [cellKey]: { ...prev[cellKey], [type]: 0 }
        }));
        return;
    }
    const parsed = parseInt(value, 10);
    setCounts(prev => ({
      ...prev,
      [cellKey]: { ...prev[cellKey], [type]: isNaN(parsed) ? 0 : parsed }
    }));
  };

  const handleGlobalInput = (type, value) => {
    if (value === '') {
      setGlobalCounts(prev => ({ ...prev, [type]: 0 }));
      return;
    }
    const parsed = parseInt(value, 10);
    setGlobalCounts(prev => ({
      ...prev,
      [type]: isNaN(parsed) ? 0 : parsed
    }));
  };

  const resetAll = () => {
    if (window.confirm("Borrar todos los conteos?")) {
      setCounts({
        tl: { live: 0, dead: 0 },
        tr: { live: 0, dead: 0 },
        c:  { live: 0, dead: 0 },
        bl: { live: 0, dead: 0 },
        br: { live: 0, dead: 0 },
      });
      setGlobalCounts({ live: 0, dead: 0 });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans pb-20">
      <CountingModal 
        activeCell={activeCell}
        counts={counts}
        updateCount={updateCount}
        handleDirectInput={handleDirectInput}
        onClose={() => setActiveCell(null)}
      />

      {/* Header */}
      <header className="bg-indigo-900 p-4 shadow-lg sticky top-0 z-10 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Microscope className="text-white h-6 w-6" />
          <h1 className="text-lg font-bold text-white">Lab Bodega</h1>
        </div>
        <button onClick={resetAll} className="text-xs bg-indigo-800 px-3 py-1 rounded text-indigo-200 hover:text-white">
          Nueva Muestra
        </button>
      </header>

      <main className="p-4 max-w-md mx-auto space-y-6">
        
        {/* Seccion 1: Calculadora de Dilucion */}
        <section className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          <div 
            className="p-3 bg-slate-800/50 flex justify-between items-center cursor-pointer"
            onClick={() => setShowDilution(!showDilution)}
          >
            <div className="flex items-center gap-2 text-indigo-300">
              <FlaskConical size={18} />
              <span className="font-semibold text-sm">Preparacion de Muestra</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-slate-700 px-2 py-0.5 rounded text-white font-mono">
                FD: {dilutionFactor.toFixed(1)}x
              </span>
              {showDilution ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </div>
          
          {showDilution && (
            <div className="p-4 space-y-4">
              {/* Presets Rapidos */}
              <div>
                <label className="text-xs font-bold uppercase text-slate-500 mb-2 block">Cargar Protocolo</label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => applyPreset('cuba')}
                    className="py-2 px-3 bg-indigo-600/20 border border-indigo-500/50 rounded-lg text-indigo-300 text-sm font-medium hover:bg-indigo-600 hover:text-white transition-colors flex items-center justify-center gap-2"
                  >
                    <Settings2 size={14} />
                    Cuba (1:10)
                  </button>
                  <button 
                    onClick={() => applyPreset('fermentador')}
                    className="py-2 px-3 bg-purple-600/20 border border-purple-500/50 rounded-lg text-purple-300 text-sm font-medium hover:bg-purple-600 hover:text-white transition-colors flex items-center justify-center gap-2"
                  >
                    <Settings2 size={14} />
                    Ferm. (1:40)
                  </button>
                </div>
              </div>

              {/* Paso 1: Dilucion con Agua */}
              <div className="space-y-2 border-t border-slate-800 pt-3">
                <label className="text-xs font-bold uppercase text-slate-500">1. Dilucion Inicial</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-slate-400 block mb-1">Muestra (mL)</span>
                    <input 
                      type="number" 
                      step="0.1"
                      value={volumes.sample}
                      onChange={(e) => handleVolumeChange('sample', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-center text-white focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block mb-1">Agua (mL)</span>
                    <input 
                      type="number" 
                      step="0.1"
                      value={volumes.water}
                      onChange={(e) => handleVolumeChange('water', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-center text-white focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Paso 2: Tincion */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex justify-between">
                  <label className="text-xs font-bold uppercase text-slate-500">2. Tincion ("Extrapolacion x2")</label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-slate-400 block mb-1">Alicuota (mL)</span>
                    <input 
                      type="number" 
                      step="0.1"
                      value={volumes.aliquot}
                      onChange={(e) => handleVolumeChange('aliquot', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-center text-white focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block mb-1">Azul (mL)</span>
                    <input 
                      type="number" 
                      step="0.1"
                      value={volumes.stain}
                      onChange={(e) => handleVolumeChange('stain', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-center text-white focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Seccion 2: Conteo y Modo */}
        <section>
          <div className="flex justify-between items-end mb-4 bg-slate-900 p-2 rounded-lg border border-slate-800">
            {/* Toggle Mode */}
            <div className="flex bg-slate-950 p-1 rounded-lg">
              <button 
                onClick={() => setCountingMode(5)}
                className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-1 transition-colors ${countingMode === 5 ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <Grid3x3 size={14} />
                5 Cuadros
              </button>
              <button 
                onClick={() => setCountingMode(13)}
                className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-1 transition-colors ${countingMode === 13 ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <List size={14} />
                13 Cuadros
              </button>
            </div>
            
            <div className="text-xs text-slate-500 px-2">
              Total: <span className="text-white font-bold">{totals.all}</span>
            </div>
          </div>

          {/* VISTA 5 CUADROS: GRID VISUAL */}
          {countingMode === 5 && (
            <>
              <div className="aspect-square w-full bg-slate-900 rounded-xl border-4 border-slate-800 p-2 relative shadow-inner">
                {/* Grid Lines Visual Effect */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-10">
                  <div className="border-r border-b border-white"></div>
                  <div className="border-r border-b border-white"></div>
                  <div className="border-b border-white"></div>
                  <div className="border-r border-b border-white"></div>
                  <div className="border-r border-b border-white"></div>
                  <div className="border-b border-white"></div>
                  <div className="border-r border-white"></div>
                  <div className="border-r border-white"></div>
                  <div></div>
                </div>

                {/* Interactive Grid 3x3 */}
                <div className="grid grid-cols-3 grid-rows-3 gap-2 h-full relative z-0">
                  {/* Row 1 */}
                  <GridCell active={true} label="TL" data={counts.tl} onClick={() => setActiveCell({key: 'tl', label: 'Superior Izquierda'})} />
                  <GridCell active={false} />
                  <GridCell active={true} label="TR" data={counts.tr} onClick={() => setActiveCell({key: 'tr', label: 'Superior Derecha'})} />
                  
                  {/* Row 2 */}
                  <GridCell active={false} />
                  <GridCell active={true} label="Centro" data={counts.c} onClick={() => setActiveCell({key: 'c', label: 'Central'})} />
                  <GridCell active={false} />

                  {/* Row 3 */}
                  <GridCell active={true} label="BL" data={counts.bl} onClick={() => setActiveCell({key: 'bl', label: 'Inferior Izquierda'})} />
                  <GridCell active={false} />
                  <GridCell active={true} label="BR" data={counts.br} onClick={() => setActiveCell({key: 'br', label: 'Inferior Derecha'})} />
                </div>
              </div>
              <p className="text-center text-xs text-slate-500 mt-2">Esquema en Z para alta densidad (5 cuadros)</p>
            </>
          )}

          {/* VISTA 13 CUADROS: INPUT MANUAL */}
          {countingMode === 13 && (
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 space-y-6">
              <div className="text-center">
                <span className="text-xs font-bold text-slate-500 uppercase">Modo Baja Densidad</span>
                <p className="text-sm text-slate-300 mt-1">Ingresa el total sumado de los 13 cuadros</p>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-slate-950 p-4 rounded-lg border border-green-900/30">
                  <span className="text-green-400 font-bold text-lg">Vivas</span>
                  <input 
                    type="number" 
                    placeholder="0"
                    value={globalCounts.live || ''}
                    onChange={(e) => handleGlobalInput('live', e.target.value)}
                    className="bg-transparent text-right text-4xl font-mono text-white font-bold outline-none w-32 border-b border-slate-800 focus:border-green-500"
                  />
                </div>

                <div className="flex items-center justify-between bg-slate-950 p-4 rounded-lg border border-red-900/30">
                  <span className="text-red-400 font-bold text-lg">Muertas</span>
                  <input 
                    type="number" 
                    placeholder="0"
                    value={globalCounts.dead || ''}
                    onChange={(e) => handleGlobalInput('dead', e.target.value)}
                    className="bg-transparent text-right text-4xl font-mono text-white font-bold outline-none w-32 border-b border-slate-800 focus:border-red-500"
                  />
                </div>
              </div>
            </div>
          )}

        </section>

        {/* Seccion 3: Resultados */}
        <section className="bg-slate-900 rounded-xl border border-slate-800 p-4 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Calculator className="text-indigo-400" size={18} />
            <h2 className="font-bold text-white">Resultados</h2>
          </div>

          {/* Tarjeta Principal: Concentracion Total y Viabilidad */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-lg p-3 text-center">
              <span className="text-xs text-indigo-300 block mb-1">Conc. Total</span>
              <span className="text-2xl font-bold text-white block">{results.concTotal}</span>
              <span className="text-[10px] text-indigo-400">millones celulas/mL</span>
            </div>
            <div className={`border rounded-lg p-3 text-center ${parseFloat(results.viability) > 80 ? 'bg-green-900/20 border-green-500/30' : 'bg-orange-900/20 border-orange-500/30'}`}>
              <span className={`text-xs block mb-1 ${parseFloat(results.viability) > 80 ? 'text-green-300' : 'text-orange-300'}`}>Viabilidad</span>
              <span className="text-2xl font-bold text-white block">{results.viability}%</span>
              <span className="text-[10px] opacity-70">celulas vivas</span>
            </div>
          </div>

          {/* Detalles Vivas/Muertas */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800">
            <div className="flex flex-col">
              <span className="text-xs text-green-400 font-bold">Vivas</span>
              <span className="text-lg font-mono text-white">{results.concLive} <span className="text-[10px] text-slate-500">M/mL</span></span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-xs text-red-400 font-bold">Muertas</span>
              <span className="text-lg font-mono text-white">{results.concDead} <span className="text-[10px] text-slate-500">M/mL</span></span>
            </div>
          </div>
          <div className="text-[10px] text-slate-600 text-center font-mono">
             Formula: (N / {countingMode}) � 25 � 10t � {dilutionFactor.toFixed(1)}
          </div>
        </section>

      </main>
    </div>
  );
};

export default App;