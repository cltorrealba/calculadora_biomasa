import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Beaker, Calculator, Microscope, RotateCcw, Droplets, FlaskConical, ChevronDown, ChevronUp, Save, Settings2, Grid3x3, List, Clock, Trash2, ClipboardList, Search, CheckCircle, AlertCircle, Cloud, CloudOff } from 'lucide-react';
import { auth, db } from './firebase';
import { useFirestoreSync } from './hooks/useFirestoreSync';
import pkg from '../package.json';

// --- Componentes UI Extraidos ---

const GridCell = ({ label, data, active, onClick }) => {
  const total = data ? data.live + data.dead : 0;
  const isCounted = data ? data.isCounted : false;
  
  const baseClasses = "relative rounded-lg flex flex-col items-center justify-center p-2 transition-all duration-200 border-2";
  const activeClasses = "bg-slate-800 border-indigo-500 hover:bg-slate-700 cursor-pointer shadow-lg active:scale-95";
  const inactiveClasses = "bg-slate-900/50 border-slate-800 opacity-30 pointer-events-none";

  if (!active) {
    return <div className={`${baseClasses} ${inactiveClasses}`}></div>;
  }

  return (
    <div onClick={onClick} className={`${baseClasses} ${activeClasses}`}>
      <span className="text-xs font-bold text-slate-400 absolute top-1 left-2">{label}</span>
      {isCounted ? (
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
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            name={`live-${activeCell.key}-${Date.now()}`}
            min="0"
            value={data.live === 0 ? '' : data.live} 
            placeholder="0"
            onChange={(e) => handleDirectInput(activeCell.key, 'live', e.target.value)}
            onWheel={(e) => e.target.blur()}
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
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            name={`dead-${activeCell.key}-${Date.now()}`}
            min="0"
            value={data.dead === 0 ? '' : data.dead} 
            placeholder="0"
            onChange={(e) => handleDirectInput(activeCell.key, 'dead', e.target.value)}
            onWheel={(e) => e.target.blur()}
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


// Helper: Sanitizar datos de sesión de Firestore
// Firestore puede devolver strings en vez de numbers (originados de input values),
// lo que corrompe operaciones aritméticas: "5" + "0" = "50", no 5.
const sanitizeNumber = (val, fallback = 0) => {
  const n = Number(val);
  return isNaN(n) ? fallback : n;
};

const sanitizeCellData = (cell) => ({
  live: sanitizeNumber(cell?.live, 0),
  dead: sanitizeNumber(cell?.dead, 0),
  isCounted: Boolean(cell?.isCounted)
});

const sanitizeSession = (session) => {
  if (!session) return null;
  return {
    sampleId: session.sampleId || '',
    density: session.density !== undefined && session.density !== '' ? String(session.density) : '',
    countingMode: sanitizeNumber(session.countingMode, 5),
    volumes: {
      sample: sanitizeNumber(session.volumes?.sample, 1),
      water: sanitizeNumber(session.volumes?.water, 9),
      aliquot: sanitizeNumber(session.volumes?.aliquot, 1),
      stain: sanitizeNumber(session.volumes?.stain, 1),
    },
    counts: {
      tl: sanitizeCellData(session.counts?.tl),
      tr: sanitizeCellData(session.counts?.tr),
      c: sanitizeCellData(session.counts?.c),
      bl: sanitizeCellData(session.counts?.bl),
      br: sanitizeCellData(session.counts?.br),
    },
    globalCounts: sanitizeCellData(session.globalCounts),
  };
};

// --- App Principal ---

const appVersion = pkg.version;

const App = () => {
  // --- Estados Primero ---
  // Modal de confirmacion (con soporte para modo Alerta)
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, message: '', onConfirm: null, isAlert: false });
  
  // Identificador de muestra
  const [sampleId, setSampleId] = useState('');
  
  // Pestanas (Tabs)
  const [activeTab, setActiveTab] = useState('counter'); // 'counter' o 'history'
  
  // Estado para busqueda en historial
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado visual del boton de guardado ('idle', 'error', 'saved')
  const [saveStatus, setSaveStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Historial (cargado desde Firestore)
  const [history, setHistory] = useState([]);

  // Configuracion de Dilucion (Volumenes en mL) y densidad
  const [volumes, setVolumes] = useState({
    sample: 1,
    water: 9,
    aliquot: 1,
    stain: 1
  });
  
  const [density, setDensity] = useState(''); // Densidad opcional (float o int)

  // Modo de conteo: 5 cuadros (Standard Z) o 13 cuadros (Baja densidad)
  const [countingMode, setCountingMode] = useState(5);

  // Estado del conteo DETALLADO (para modo 5 cuadros)
  const [counts, setCounts] = useState({
    tl: { live: 0, dead: 0, isCounted: false },
    tr: { live: 0, dead: 0, isCounted: false },
    c:  { live: 0, dead: 0, isCounted: false },
    bl: { live: 0, dead: 0, isCounted: false },
    br: { live: 0, dead: 0, isCounted: false },
  });

  // Estado del conteo GLOBAL (para modo 13 cuadros)
  const [globalCounts, setGlobalCounts] = useState({
    live: 0, 
    dead: 0,
    isCounted: false
  });

  // Estado para el modal de conteo
  const [activeCell, setActiveCell] = useState(null);
  
  // Estado para colapsar seccion de dilucion
  const [showDilution, setShowDilution] = useState(true);

  // --- Firestore ---
  const [userId, setUserId] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const { saveSession, loadSession, addToHistory, subscribeToHistory, deleteFromHistory } = useFirestoreSync(userId);

  // Autenticar y cargar sesión al iniciar
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUserId(user.uid);
        setIsSyncing(true);
        
        // Cargar sesión guardada y SANITIZAR tipos
        const rawSession = await loadSession();
        const savedSession = sanitizeSession(rawSession);
        if (savedSession) {
          setSampleId(savedSession.sampleId);
          setVolumes(savedSession.volumes);
          setDensity(savedSession.density);
          setCountingMode(savedSession.countingMode);
          setCounts(savedSession.counts);
          setGlobalCounts(savedSession.globalCounts);
        }
        
        setIsSyncing(false);
        // CRITICAL: Solo habilitar sync DESPUÉS de cargar la sesión
        // Previene que el useEffect de sync sobreescriba datos reales con defaults
        setSessionLoaded(true);
      } else {
        // Usuario no autenticado aún, no sincronizar
        setSessionLoaded(false);
      }
    });

    return unsubscribe;
  }, []);

  // Suscribirse al historial compartido en Firestore
  useEffect(() => {
    const unsubscribe = subscribeToHistory((firestoreHistory) => {
      setHistory(firestoreHistory);
    });
    return unsubscribe;
  }, [subscribeToHistory]);

  // Sincronizar cambios con Firestore en tiempo real
  // CRITICAL: Solo sincronizar DESPUÉS de que la sesión haya sido cargada
  // para evitar sobreescribir datos reales con valores por defecto
  useEffect(() => {
    if (!userId || !sessionLoaded) return;

    const syncData = async () => {
      // Sanitizar antes de guardar para nunca escribir strings como números
      await saveSession({
        sampleId,
        volumes: {
          sample: sanitizeNumber(volumes.sample, 1),
          water: sanitizeNumber(volumes.water, 9),
          aliquot: sanitizeNumber(volumes.aliquot, 1),
          stain: sanitizeNumber(volumes.stain, 1),
        },
        density,
        countingMode,
        counts: {
          tl: sanitizeCellData(counts.tl),
          tr: sanitizeCellData(counts.tr),
          c: sanitizeCellData(counts.c),
          bl: sanitizeCellData(counts.bl),
          br: sanitizeCellData(counts.br),
        },
        globalCounts: sanitizeCellData(globalCounts),
      });
    };

    const timer = setTimeout(syncData, 1000);
    return () => clearTimeout(timer);
  }, [sampleId, volumes, density, countingMode, counts, globalCounts, userId, sessionLoaded, saveSession]);

  // --- Calculos ---

  const dilutionFactor = useMemo(() => {
    const vSample = Number(volumes.sample) || 0;
    const vWater = Number(volumes.water) || 0;
    const vAliquot = Number(volumes.aliquot) || 0;
    const vStain = Number(volumes.stain) || 0;

    if (vSample === 0 || vAliquot === 0) return 1;

    // Paso 1: Dilucion inicial (Muestra + Agua)
    const df1 = (vSample + vWater) / vSample;
    
    // Paso 2: Tincion (Alicuota + Tinte)
    // NOTA: Esto corresponde al "x2" de la formula cuando es 1:1
    const df2 = (vAliquot + vStain) / vAliquot;

    return df1 * df2;
  }, [volumes]);

  // Totales unificados segun el modo (con coercion defensiva a Number)
  const totals = useMemo(() => {
    if (countingMode === 5) {
      const cells = Object.values(counts);
      const totalLive = cells.reduce((acc, curr) => acc + Number(curr.live || 0), 0);
      const totalDead = cells.reduce((acc, curr) => acc + Number(curr.dead || 0), 0);
      return { live: totalLive, dead: totalDead, all: totalLive + totalDead };
    } else {
      // Modo 13 cuadros
      const live = Number(globalCounts.live) || 0;
      const dead = Number(globalCounts.dead) || 0;
      return { live, dead, all: live + dead };
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

  // Historial Filtrado
  const filteredHistory = useMemo(() => {
    if (!searchTerm) return history;
    const lowerSearch = searchTerm.toLowerCase();
    return history.filter(record => 
      record.sampleId.toLowerCase().includes(lowerSearch) || 
      record.timestamp.toLowerCase().includes(lowerSearch)
    );
  }, [history, searchTerm]);

  // --- Manejadores ---

  const handleVolumeChange = (field, value) => {
    // Permitir string vacío y valores numéricos decimales válidos
    if (value === '' || value === '.') {
      setVolumes(prev => ({ ...prev, [field]: value }));
      return;
    }
    // Sanitizar: solo permitir dígitos y un punto decimal
    const sanitized = value.replace(/[^0-9.]/g, '');
    // Evitar múltiples puntos
    const parts = sanitized.split('.');
    const clean = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : sanitized;
    setVolumes(prev => ({ ...prev, [field]: clean }));
  };

  const applyPreset = (type) => {
    if (type === 'cuba') {
      setVolumes(prev => ({ ...prev, sample: 1, water: 9, aliquot: 1, stain: 1 }));
      setCountingMode(5);
    } else if (type === 'fermentador') {
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
        [cellKey]: { ...prev[cellKey], [type]: newVal, isCounted: true }
      };
    });
  };

  const handleDirectInput = (cellKey, type, value) => {
    if (value === '') {
        setCounts(prev => ({
            ...prev,
            [cellKey]: { ...prev[cellKey], [type]: 0, isCounted: true }
        }));
        return;
    }
    // Sanitizar: solo permitir dígitos, rechazar texto inyectado por autocomplete
    const sanitized = String(value).replace(/[^0-9]/g, '');
    if (sanitized === '') return; // Ignorar input completamente no-numérico
    const parsed = Math.max(0, parseInt(sanitized, 10));
    setCounts(prev => ({
      ...prev,
      [cellKey]: { ...prev[cellKey], [type]: isNaN(parsed) ? 0 : parsed, isCounted: true }
    }));
  };

  const handleGlobalInput = (type, value) => {
    if (value === '') {
      setGlobalCounts(prev => ({ ...prev, [type]: 0, isCounted: true }));
      return;
    }
    // Sanitizar: solo permitir dígitos, rechazar texto inyectado por autocomplete
    const sanitized = String(value).replace(/[^0-9]/g, '');
    if (sanitized === '') return; // Ignorar input completamente no-numérico
    const parsed = Math.max(0, parseInt(sanitized, 10));
    setGlobalCounts(prev => ({
      ...prev,
      [type]: isNaN(parsed) ? 0 : parsed,
      isCounted: true
    }));
  };

  // Funcion silenciosa para limpiar el formulario despues de guardar
  const clearForm = useCallback(() => {
    setCounts({
      tl: { live: 0, dead: 0, isCounted: false },
      tr: { live: 0, dead: 0, isCounted: false },
      c:  { live: 0, dead: 0, isCounted: false },
      bl: { live: 0, dead: 0, isCounted: false },
      br: { live: 0, dead: 0, isCounted: false },
    });
    setGlobalCounts({ live: 0, dead: 0, isCounted: false });
    setSampleId('');
    setVolumes({ sample: 1, water: 9, aliquot: 1, stain: 1 });
    setDensity('');
    setCountingMode(5);
    setActiveCell(null);
  }, []);

  // Marca el cuadro como revisado al cerrar el modal aunque no se haya presionado +-
  const closeCountingModal = () => {
    if (activeCell) {
      setCounts(prev => ({
        ...prev,
        [activeCell.key]: { ...prev[activeCell.key], isCounted: true }
      }));
      setActiveCell(null);
    }
  };

  // Funcion atada al boton superior "Nueva Muestra"
  const handleNewSample = () => {
    const hasPartialData = sampleId.trim() !== '' || totals.all > 0;
    if (hasPartialData) {
      setConfirmDialog({
        isOpen: true,
        message: "Hay datos sin guardar. Deseas reiniciar el formulario y perder los datos actuales?",
        onConfirm: () => clearForm(),
        isAlert: false
      });
      return;
    }
    clearForm();
  };

  const saveToHistory = () => {
    let msg = "";
    
    // Verificamos si los cuadros requeridos fueron revisados
    const uncountedSquares = countingMode === 5 
        ? Object.values(counts).filter(c => !c.isCounted).length 
        : (!globalCounts.isCounted ? 13 : 0);

    // Jerarquia de validaciones
    const vSample = Number(volumes.sample);
    const vAliquot = Number(volumes.aliquot);
    if (!sampleId.trim()) {
      msg = "Falta ingresar el Identificador de Muestra.";
    } else if (!vSample || vSample <= 0 || !vAliquot || vAliquot <= 0) {
      msg = "Revisa los volumenes ingresados. No pueden estar vacios o en cero.";
    } else if (uncountedSquares > 0) {
      if (countingMode === 5) {
        msg = `Aun faltan ${uncountedSquares} cuadro(s) por revisar en la camara.`;
      } else {
        msg = "Falta ingresar el conteo total de celulas.";
      }
    }

    if (msg !== "") {
      setConfirmDialog({
        isOpen: true,
        message: msg + " Por favor, completa toda la informacion requerida previo a guardar.",
        onConfirm: null,
        isAlert: true
      });
      
      setErrorMessage(msg.split('.')[0]);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2500);
      return;
    }

    const newRecord = {
      id: Date.now(),
      timestamp: new Date().toLocaleString(),
      sampleId,
      mode: countingMode,
      volumes: {
        sample: sanitizeNumber(volumes.sample, 1),
        water: sanitizeNumber(volumes.water, 0),
        aliquot: sanitizeNumber(volumes.aliquot, 1),
        stain: sanitizeNumber(volumes.stain, 0),
      },
      ...(density && { density: parseFloat(density) }),
      totals: { ...totals },
      results: { ...results },
      dilutionFactor
    };

    // Guardar en Firestore (la actualización local se hace vía listener)
    addToHistory(newRecord)
      .then(() => {
        setSaveStatus('saved');
        setTimeout(() => {
          setSaveStatus('idle');
          clearForm();
        }, 2000);
      })
      .catch((error) => {
        console.error('Error guardando:', error);
        setErrorMessage('Error al guardar en la nube');
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 2500);
      });
  };

  const deleteRecord = (id) => {
    setConfirmDialog({
      isOpen: true,
      message: "Eliminar este registro permanentemente?",
      onConfirm: () => {
        deleteFromHistory(id)
          .catch(error => {
            console.error('Error eliminando:', error);
            alert('Error al eliminar el registro');
          });
      },
      isAlert: false
    });
  };

  const clearHistory = () => {
    setConfirmDialog({
      isOpen: true,
      message: "Estas seguro de borrar TODO el historial? Esta accion no se puede deshacer y afectara a todos los usuarios.",
      onConfirm: async () => {
        try {
          // Eliminar todos los registros del historial
          const deletePromises = history.map(record => deleteFromHistory(record.id));
          await Promise.all(deletePromises);
        } catch (error) {
          console.error('Error limpiando historial:', error);
          alert('Error al limpiar el historial');
        }
      },
      isAlert: false
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans pb-24">
      {/* Modal de Confirmacion Customizado */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-950/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl w-full max-w-sm shadow-2xl">
            <p className="text-white mb-6 text-center font-medium">{confirmDialog.message}</p>
            <div className="flex gap-4">
              {confirmDialog.isAlert ? (
                <button 
                  onClick={() => setConfirmDialog({ isOpen: false, message: '', onConfirm: null, isAlert: false })} 
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors font-bold"
                >
                  Entendido
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => setConfirmDialog({ isOpen: false, message: '', onConfirm: null, isAlert: false })} 
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => { 
                      if (confirmDialog.onConfirm) confirmDialog.onConfirm(); 
                      setConfirmDialog({ isOpen: false, message: '', onConfirm: null, isAlert: false }); 
                    }} 
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors font-bold"
                  >
                    Confirmar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <CountingModal 
        activeCell={activeCell}
        counts={counts}
        updateCount={updateCount}
        handleDirectInput={handleDirectInput}
        onClose={closeCountingModal}
      />

      {/* Header Actualizado */}
      <header className="bg-indigo-900 shadow-lg sticky top-0 z-10 p-3">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-1.5 rounded-lg flex items-center justify-center shrink-0">
              <img 
                src="/logo-cii.jpeg" 
                alt="CII Logo" 
                className="h-8 object-contain"
              />
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm font-bold text-white leading-tight">Laboratorio de Microbiologia</h1>
              <span className="text-[10px] text-indigo-200 font-medium leading-tight max-w-[200px]">By Centro de Investigacion e Innovacion Vina Concha y Toro</span>
              <span className="text-[10px] text-indigo-300/80 font-mono leading-tight">v{appVersion}</span>
            </div>
          </div>
          
          {activeTab === 'counter' && (
            <button onClick={handleNewSample} className="text-[11px] bg-indigo-800 px-3 py-1.5 rounded-md text-indigo-100 hover:text-white hover:bg-indigo-700 transition-colors shadow-sm font-bold shrink-0">
              Nueva<br/>Muestra
            </button>
          )}
        </div>
      </header>

      <main className="p-4 max-w-md mx-auto space-y-6">
        
        {/* VISTA DEL CONTADOR */}
        {activeTab === 'counter' && (
          <form autoComplete="off" onSubmit={(e) => e.preventDefault()}>
            {/* Campos señuelo ocultos para confundir el autocomplete de Chrome */}
            <div style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
              <input type="text" name="fake-name" tabIndex={-1} />
              <input type="text" name="fake-email" tabIndex={-1} />
              <input type="password" name="fake-pass" tabIndex={-1} />
            </div>
            {/* Identificador de Muestra */}
            <section className="bg-slate-900 rounded-xl border border-slate-800 p-3 shadow-sm">
              <label className="text-xs font-bold uppercase text-slate-500 mb-1 block flex justify-between items-center">
                <span>Identificador de Muestra</span>
                {saveStatus === 'error' && errorMessage === 'Falta Identificador' && <span className="text-red-400 text-[10px] flex items-center gap-1"><AlertCircle size={12}/> Campo Obligatorio</span>}
              </label>
              <input 
                type="text"
                autoComplete="one-time-code"
                name="sample-identifier"
                id="sample-id-field"
                value={sampleId}
                onChange={(e) => setSampleId(e.target.value)}
                placeholder="Ej: Cuba 4, Lote A, Barrica 12..."
                className={`w-full bg-slate-950 border ${saveStatus === 'error' ? 'border-red-500/50' : 'border-slate-700'} rounded p-2 text-white focus:border-indigo-500 outline-none transition-colors`}
              />
            </section>

            {/* Seccion 1: Calculadora de Dilucion */}
            <section className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-sm">
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
                        className="py-2 px-3 bg-indigo-600/20 border border-indigo-500/50 rounded-lg text-indigo-300 text-sm font-medium hover:bg-indigo-600 hover:text-white transition-colors flex items-center justify-center gap-2 shadow-sm"
                      >
                        <Settings2 size={14} />
                        Cuba (1:10)
                      </button>
                      <button 
                        onClick={() => applyPreset('fermentador')}
                        className="py-2 px-3 bg-purple-600/20 border border-purple-500/50 rounded-lg text-purple-300 text-sm font-medium hover:bg-purple-600 hover:text-white transition-colors flex items-center justify-center gap-2 shadow-sm"
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
                          type="text"
                          inputMode="decimal"
                          autoComplete="one-time-code"
                          name="vol-sample"
                          value={volumes.sample}
                          onChange={(e) => handleVolumeChange('sample', e.target.value)}
                          onFocus={(e) => { if (e.target.value === '0') e.target.select(); }}
                          className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-center text-white focus:border-indigo-500 outline-none"
                        />
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 block mb-1">Agua (mL)</span>
                        <input 
                          type="text"
                          inputMode="decimal"
                          autoComplete="one-time-code"
                          name="vol-water"
                          value={volumes.water}
                          onChange={(e) => handleVolumeChange('water', e.target.value)}
                          onFocus={(e) => { if (e.target.value === '0') e.target.select(); }}
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
                          type="text"
                          inputMode="decimal"
                          autoComplete="one-time-code"
                          name="vol-aliquot"
                          value={volumes.aliquot}
                          onChange={(e) => handleVolumeChange('aliquot', e.target.value)}
                          onFocus={(e) => { if (e.target.value === '0') e.target.select(); }}
                          className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-center text-white focus:border-indigo-500 outline-none"
                        />
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 block mb-1">Azul (mL)</span>
                        <input 
                          type="text"
                          inputMode="decimal"
                          autoComplete="one-time-code"
                          name="vol-stain"
                          value={volumes.stain}
                          onChange={(e) => handleVolumeChange('stain', e.target.value)}
                          onFocus={(e) => { if (e.target.value === '0') e.target.select(); }}
                          className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-center text-white focus:border-indigo-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Densidad */}
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <label className="text-xs font-bold uppercase text-slate-500">3. Densidad (g/mL)</label>
                    <input 
                      type="text"
                      inputMode="decimal"
                      autoComplete="one-time-code"
                      name="density-value"
                      value={density}
                      onChange={(e) => setDensity(e.target.value)}
                      placeholder="Ej: 1095.3"
                      className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-center text-white focus:border-indigo-500 outline-none"
                    />
                    <p className="text-[10px] text-slate-600 text-center">Opcional - Acepta valores enteros o decimales</p>
                  </div>
                </div>
              )}
            </section>

            {/* Seccion 2: Conteo y Modo */}
            <section>
              <div className="flex justify-between items-end mb-4 bg-slate-900 p-2 rounded-lg border border-slate-800 shadow-sm">
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
                <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 space-y-6 shadow-sm">
                  <div className="text-center">
                    <span className="text-xs font-bold text-slate-500 uppercase">Modo Baja Densidad</span>
                    <p className="text-sm text-slate-300 mt-1">Ingresa el total sumado de los 13 cuadros</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between bg-slate-950 p-4 rounded-lg border border-green-900/30">
                      <span className="text-green-400 font-bold text-lg">Vivas</span>
                      <input 
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="one-time-code"
                        name="global-live-count"
                        placeholder="0"
                        value={globalCounts.live || ''}
                        onChange={(e) => handleGlobalInput('live', e.target.value)}
                        className="bg-transparent text-right text-4xl font-mono text-white font-bold outline-none w-32 border-b border-slate-800 focus:border-green-500"
                      />
                    </div>

                    <div className="flex items-center justify-between bg-slate-950 p-4 rounded-lg border border-red-900/30">
                      <span className="text-red-400 font-bold text-lg">Muertas</span>
                      <input 
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="one-time-code"
                        name="global-dead-count"
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
            <section className="bg-slate-900 rounded-xl border border-slate-800 p-4 space-y-4 shadow-sm">
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
                 Fórmula: (N / {countingMode}) × 25 × 10⁴ × {dilutionFactor.toFixed(1)}
              </div>

              {/* Boton Guardar Mejorado */}
              <button 
                onClick={saveToHistory}
                disabled={saveStatus === 'saved'}
                className={`w-full mt-4 py-3 rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg transition-all duration-300 ${
                  saveStatus === 'saved' 
                    ? 'bg-green-600 text-white' 
                    : saveStatus === 'error'
                      ? 'bg-red-600 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
              >
                {saveStatus === 'saved' ? (
                  <><CheckCircle size={20} className="animate-pulse" /> Guardado Exitosamente!</>
                ) : saveStatus === 'error' ? (
                  <><AlertCircle size={20} /> {errorMessage}</>
                ) : (
                  <><Save size={20} /> Guardar en Historial</>
                )}
              </button>
            </section>
          </form>
        )}

        {/* VISTA DEL HISTORIAL */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            
            {/* Buscador */}
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 shadow-sm flex items-center gap-2">
              <Search className="text-slate-500" size={18} />
              <input 
                type="text"
                autoComplete="one-time-code"
                name="history-search"
                placeholder="Buscar por ID o Fecha..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent w-full text-white text-sm outline-none placeholder-slate-600"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="text-slate-500 hover:text-white">
                  &times;
                </button>
              )}
            </div>
            
            {history.length === 0 ? (
              <div className="text-center p-8 bg-slate-900 rounded-xl border border-slate-800">
                <ClipboardList className="mx-auto h-12 w-12 text-slate-600 mb-3" />
                <p className="text-slate-400 text-sm">No hay registros en el historial.</p>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="text-center p-8 bg-slate-900 rounded-xl border border-slate-800">
                <Search className="mx-auto h-8 w-8 text-slate-600 mb-3" />
                <p className="text-slate-400 text-sm">No se encontraron resultados para "{searchTerm}".</p>
              </div>
            ) : (
              filteredHistory.map((record) => (
                <div key={record.id} className="bg-slate-900 rounded-xl border border-slate-800 p-4 space-y-3 relative group">
                  <div className="flex justify-between items-start border-b border-slate-800 pb-2 pr-8">
                    <div>
                      <span className="text-lg font-bold text-white block">{record.sampleId}</span>
                      <span className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <Clock size={12} /> {record.timestamp}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-bold block ${parseFloat(record.results.viability) > 80 ? 'text-green-400' : 'text-orange-400'}`}>
                        {record.results.viability}% Viab.
                      </span>
                      <span className="text-xs text-slate-400">FD: {record.dilutionFactor.toFixed(1)}x ({record.mode} c.)</span>
                    </div>
                  </div>
                  
                  {/* Boton Eliminar Individual */}
                  <button 
                    onClick={() => deleteRecord(record.id)}
                    className="absolute top-4 right-4 text-slate-600 hover:text-red-400 p-1 transition-colors"
                    title="Eliminar Registro"
                  >
                    <Trash2 size={18} />
                  </button>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-slate-950 p-2 rounded border border-slate-800/50">
                      <span className="text-[10px] text-slate-500 block uppercase">Conc. Total</span>
                      <span className="font-mono text-indigo-300">{record.results.concTotal} M/mL</span>
                    </div>
                    <div className="bg-slate-950 p-2 rounded border border-slate-800/50">
                      <span className="text-[10px] text-slate-500 block uppercase">Conteo Real</span>
                      <span className="font-mono text-slate-300">V:{record.totals.live} | M:{record.totals.dead}</span>
                    </div>
                    {record.density && (
                      <div className="bg-slate-950 p-2 rounded border border-slate-800/50 col-span-2">
                        <span className="text-[10px] text-slate-500 block uppercase">Densidad</span>
                        <span className="font-mono text-slate-300">{record.density} g/mL</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 flex p-2 pb-4 z-40">
        <button 
          onClick={() => setActiveTab('counter')}
          className={`flex-1 flex flex-col items-center py-2 rounded-lg transition-colors ${activeTab === 'counter' ? 'text-indigo-400 bg-slate-800' : 'text-slate-500 hover:text-slate-400'}`}
        >
          <Calculator size={24} className="mb-1" />
          <span className="text-[10px] font-bold uppercase">Contador</span>
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex-1 flex flex-col items-center py-2 rounded-lg transition-colors ${activeTab === 'history' ? 'text-indigo-400 bg-slate-800' : 'text-slate-500 hover:text-slate-400'}`}
        >
          <ClipboardList size={24} className="mb-1" />
          <span className="text-[10px] font-bold uppercase">Historial</span>
        </button>
      </div>
    </div>
  );
};

export default App;