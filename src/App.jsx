import { useState, useCallback, useEffect, useRef } from 'react';
import TopNav from './components/TopNav';
import ObsPanel from './components/ObsPanel';
import ControlPanel from './components/ControlPanel';
import VisualizationArea from './components/VisualizationArea';
import AdvancedModal from './components/AdvancedModal';
import AddMethodModal from './components/AddMethodModal';
import AboutSection from './components/AboutSection';
import {
  OBS_MODES,
  CHART_COLORS,
  DEFAULT_ADVANCED,
  createMethodInstance,
} from './constants';
import { exportSimulationCsv } from './utils/csvExport';
import { useSimulationWorker } from './hooks/useSimulationWorker';

export default function App() {
  // --- State ---
  const [obsMode, setObsMode] = useState('full');
  const [methods, setMethods] = useState(() => [createMethodInstance('POEnKF')]);
  const [advancedOptions, setAdvancedOptions] = useState({ ...DEFAULT_ADVANCED });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAddMethod, setShowAddMethod] = useState(false);
  const [showSpread, setShowSpread] = useState(true);

  const handleSimulationSuccess = useCallback((payload) => {
    setMethods(prev =>
      prev.map(m => {
        const result = payload.results.find(r => r.methodId === m.instanceId);
        if (result) {
          return {
            ...m,
            rmseTimeSeries: result.rmseTimeSeries,
            spreadTimeSeries: result.spreadTimeSeries,
            avgRmse: result.avgRmse,
            avgSpread: result.avgSpread,
            timeSteps: result.timeSteps,
          };
        }
        return m;
      })
    );
  }, []);

  const { isRunning, simulationResults, runSimulation } =
    useSimulationWorker(handleSimulationSuccess);

  // --- Auto-Run Simulation with Debounce (60ms) ---
  // 設定を変えるたびに自動で再計算する (「再計算」ボタンは置かない)
  const autoRunTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (autoRunTimerRef.current) {
        clearTimeout(autoRunTimerRef.current);
        autoRunTimerRef.current = null;
      }
    };
  }, []);

  const triggerAutoRun = useCallback((newMethods, newObsMode, newAdvanced) => {
    if (autoRunTimerRef.current) {
      clearTimeout(autoRunTimerRef.current);
    }
    autoRunTimerRef.current = setTimeout(() => {
      autoRunTimerRef.current = null;
      runSimulation(newMethods || [], newObsMode, newAdvanced, []);
    }, 60);
  }, [runSimulation]);

  // 開いた時点で結果が出ている状態から始める
  // (フラグは実行した時点で立てる: StrictMode の effect 二重実行で予約が消されても次で走るように)
  const initialRunRef = useRef(false);
  useEffect(() => {
    if (initialRunRef.current) return;
    const id = setTimeout(() => {
      initialRunRef.current = true;
      runSimulation(methods, obsMode, advancedOptions, []);
    }, 0);
    return () => clearTimeout(id);
  }, [runSimulation, methods, obsMode, advancedOptions]);

  // --- Handlers ---
  const handleObsModeChange = useCallback((mode) => {
    setObsMode(mode);
    triggerAutoRun(methods, mode, advancedOptions);
  }, [methods, advancedOptions, triggerAutoRun]);

  const handleUpdateAdvancedOptions = useCallback((options) => {
    setAdvancedOptions(options);
    triggerAutoRun(methods, obsMode, options);
  }, [methods, obsMode, triggerAutoRun]);

  const handleUpdateMethod = useCallback((instanceId, updates) => {
    setMethods(prev => {
      const next = prev.map(m => (m.instanceId === instanceId ? { ...m, ...updates } : m));
      triggerAutoRun(next, obsMode, advancedOptions);
      return next;
    });
  }, [obsMode, advancedOptions, triggerAutoRun]);

  const handleRemoveMethod = useCallback((instanceId) => {
    setMethods(prev => {
      const next = prev.filter(m => m.instanceId !== instanceId);
      triggerAutoRun(next, obsMode, advancedOptions);
      return next;
    });
  }, [obsMode, advancedOptions, triggerAutoRun]);

  const handleAddMethod = useCallback((methodType) => {
    const instance = createMethodInstance(methodType);
    const next = [...methods, instance];
    setMethods(next);
    triggerAutoRun(next, obsMode, advancedOptions);
    setShowAddMethod(false);
  }, [methods, obsMode, advancedOptions, triggerAutoRun]);

  // 同じ条件の手法をもう 1 本作る: 1 か所だけ変えて比べるための入口
  const handleDuplicateMethod = useCallback((instanceId) => {
    const idx = methods.findIndex(m => m.instanceId === instanceId);
    if (idx < 0) return;
    const src = methods[idx];
    const copy = createMethodInstance(src.type, null, { ...src.params });
    const next = [...methods.slice(0, idx + 1), copy, ...methods.slice(idx + 1)];
    setMethods(next);
    triggerAutoRun(next, obsMode, advancedOptions);
  }, [methods, obsMode, advancedOptions, triggerAutoRun]);

  const handleCsvExport = useCallback(() => {
    exportSimulationCsv(simulationResults, advancedOptions.N);
  }, [simulationResults, advancedOptions.N]);

  return (
    <div className="app-layout">
      <TopNav
        onOpenAdvanced={() => setShowAdvanced(true)}
        onCsvExport={handleCsvExport}
        hasResults={!!simulationResults}
        isRunning={isRunning}
      />

      <main className="app-main">
        <ControlPanel
          methods={methods}
          colors={CHART_COLORS}
          onUpdateMethod={handleUpdateMethod}
          onRemoveMethod={handleRemoveMethod}
          onDuplicateMethod={handleDuplicateMethod}
          onAddMethod={() => setShowAddMethod(true)}
        />

        <VisualizationArea
          methods={methods}
          colors={CHART_COLORS}
          simulationResults={simulationResults}
          showSpread={showSpread}
          onToggleSpread={() => setShowSpread(prev => !prev)}
          obsErrorStd={Math.sqrt(advancedOptions.obsErrorVar)}
        />

        <ObsPanel
          modes={OBS_MODES}
          activeMode={obsMode}
          onChangeMode={handleObsModeChange}
          options={advancedOptions}
          onUpdateOptions={handleUpdateAdvancedOptions}
        />
      </main>

      {/* 概要（クローラ向けの本文を実 DOM に置く / 既定は折りたたみ） */}
      <AboutSection />

      {showAdvanced && (
        <AdvancedModal
          options={advancedOptions}
          onUpdate={handleUpdateAdvancedOptions}
          onClose={() => setShowAdvanced(false)}
        />
      )}

      {showAddMethod && (
        <AddMethodModal
          onSelect={handleAddMethod}
          onClose={() => setShowAddMethod(false)}
        />
      )}
    </div>
  );
}
