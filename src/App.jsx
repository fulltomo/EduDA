import { useState, useCallback, useRef } from 'react';
import TopNav from './components/TopNav';
import ObsTabs from './components/ObsTabs';
import ControlPanel from './components/ControlPanel';
import VisualizationArea from './components/VisualizationArea';
import AdvancedModal from './components/AdvancedModal';
import AddMethodModal from './components/AddMethodModal';
import {
  OBS_MODES,
  CHART_COLORS,
  DEFAULT_ADVANCED,
  createMethodInstance,
  createPresetMethodInstance,
} from './constants';

export default function App() {
  // --- State ---
  const [obsMode, setObsMode] = useState('full');
  const [methods, setMethods] = useState(() => [
    createMethodInstance('EnKF'),
  ]);
  const [advancedOptions, setAdvancedOptions] = useState({ ...DEFAULT_ADVANCED });
  const [customObsIndices, setCustomObsIndices] = useState(() =>
    Array.from({ length: DEFAULT_ADVANCED.N }, (_, i) => i)
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAddMethod, setShowAddMethod] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [simulationResults, setSimulationResults] = useState(null);
  const [showRmse, setShowRmse] = useState(true);
  const [showSpread, setShowSpread] = useState(true);
  const [activePreset, setActivePreset] = useState(null);
  const [needsRecalc, setNeedsRecalc] = useState(false);

  const workerRef = useRef(null);

  const handleObsModeChange = useCallback((mode) => {
    setActivePreset(null);
    setObsMode(mode);
    setNeedsRecalc(true);
  }, []);

  const handleUpdateAdvancedOptions = useCallback((options) => {
    setActivePreset(null);
    setAdvancedOptions(options);
    setNeedsRecalc(true);
    setCustomObsIndices(prev => prev.filter(idx => idx < options.N));
  }, []);

  const handleToggleCustomObsIndex = useCallback((index) => {
    setActivePreset(null);
    setCustomObsIndices(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index].sort((a, b) => a - b);
      }
    });
    setNeedsRecalc(true);
  }, []);

  const handleSelectAllCustomObs = useCallback(() => {
    setActivePreset(null);
    setCustomObsIndices(Array.from({ length: advancedOptions.N }, (_, i) => i));
    setNeedsRecalc(true);
  }, [advancedOptions.N]);

  const handleClearAllCustomObs = useCallback(() => {
    setActivePreset(null);
    setCustomObsIndices([]);
    setNeedsRecalc(true);
  }, []);

  const handleRandomCustomObs = useCallback((count = 10) => {
    setActivePreset(null);
    const N = advancedOptions.N;
    const actualCount = Math.min(count, N);
    const indices = Array.from({ length: N }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    const selected = indices.slice(0, actualCount).sort((a, b) => a - b);
    setCustomObsIndices(selected);
    setNeedsRecalc(true);
  }, [advancedOptions.N]);

  // --- Handlers ---
  const handleUpdateMethod = useCallback((instanceId, updates) => {
    setActivePreset(null);
    setMethods(prev =>
      prev.map(m => m.instanceId === instanceId ? { ...m, ...updates } : m)
    );
    setNeedsRecalc(true);
  }, []);

  const handleRemoveMethod = useCallback((instanceId) => {
    setActivePreset(null);
    setMethods(prev => prev.filter(m => m.instanceId !== instanceId));
    setNeedsRecalc(true);
  }, []);

  const handleAddMethod = useCallback((methodType) => {
    setActivePreset(null);
    const instance = createMethodInstance(methodType);
    setMethods(prev => [...prev, instance]);
    setNeedsRecalc(true);
    setShowAddMethod(false);
  }, []);

  const runSimulation = useCallback((targetMethods, targetObsMode, targetAdvanced, targetCustomObsIndices) => {
    if (targetMethods.length === 0) return;

    setIsRunning(true);
    setProgress(0);
    setSimulationResults(null);
    setNeedsRecalc(false);

    // Terminate existing worker
    if (workerRef.current) {
      workerRef.current.terminate();
    }

    const worker = new Worker(
      new URL('./workers/daWorker.js', import.meta.url),
      { type: 'module' }
    );
    workerRef.current = worker;

    worker.onmessage = (e) => {
      const { type, progress: prog, payload } = e.data;
      if (type === 'PROGRESS') {
        setProgress(prog);
      } else if (type === 'ERROR') {
        alert(`シミュレーションエラー: ${payload}`);
        setIsRunning(false);
        worker.terminate();
        workerRef.current = null;
      } else if (type === 'RESULT') {
        setSimulationResults(payload);
        // Update method cards with results
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
        setIsRunning(false);
        setProgress(100);
        worker.terminate();
        workerRef.current = null;
      }
    };

    worker.onerror = (err) => {
      console.error('Worker error:', err);
      alert('シミュレーション実行中にエラーが発生しました。');
      setIsRunning(false);
      worker.terminate();
      workerRef.current = null;
    };

    worker.postMessage({
      type: 'RUN_SIMULATION',
      payload: {
        methods: targetMethods.map(m => ({
          id: m.instanceId,
          type: m.type,
          params: m.params || {},
        })),
        observationMode: targetObsMode,
        advancedOptions: targetAdvanced,
        customObsIndices: targetCustomObsIndices,
      },
    });
  }, []);

  const handleRun = useCallback(() => {
    runSimulation(methods, obsMode, advancedOptions, customObsIndices);
  }, [runSimulation, methods, obsMode, advancedOptions, customObsIndices]);

  const handleSelectPreset = useCallback((preset) => {
    const instantiatedMethods = preset.methods.map(m =>
      createPresetMethodInstance(m.type, m.label, m.params)
    );
    const targetAdvanced = { ...DEFAULT_ADVANCED, ...preset.advancedOptions };

    setActivePreset(preset);
    setObsMode(preset.obsMode);
    setMethods(instantiatedMethods);
    setAdvancedOptions(targetAdvanced);

    // Run simulation immediately
    runSimulation(instantiatedMethods, preset.obsMode, targetAdvanced, customObsIndices);
  }, [runSimulation, customObsIndices]);

  const handleCsvExport = useCallback(() => {
    if (!simulationResults) return;

    const { results } = simulationResults;
    if (!results || results.length === 0) return;

    const first = results[0];
    const steps = first.timeSteps;
    const N = advancedOptions.N;

    // Build CSV header
    const headers = ['step'];
    for (let j = 0; j < N; j++) headers.push(`truth_${j}`);
    for (let j = 0; j < N; j++) headers.push(`obs_${j}`);
    for (const r of results) {
      for (let j = 0; j < N; j++) headers.push(`${r.methodId}_analysis_${j}`);
      headers.push(`${r.methodId}_rmse`);
    }

    const rows = [headers.join(',')];

    for (let i = 0; i < steps.length; i++) {
      const stepIdx = steps[i];
      const row = [stepIdx];
      // Truth at observation step
      const truth = first.truthHistory?.[stepIdx];
      for (let j = 0; j < N; j++) row.push(truth ? truth[j]?.toFixed(6) : '');
      // Obs at observation step
      const obs = first.obsHistory?.[stepIdx];
      for (let j = 0; j < N; j++) row.push(obs ? (obs[j] != null ? obs[j].toFixed(6) : '') : '');
      // Analysis per method
      for (const r of results) {
        const analysis = r.analysisHistory?.[i];
        for (let j = 0; j < N; j++) row.push(analysis ? analysis[j]?.toFixed(6) : '');
        row.push(r.rmseTimeSeries[i]?.toFixed(6) ?? '');
      }
      rows.push(row.join(','));
    }

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eduda_results_${obsMode}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [simulationResults, obsMode, advancedOptions.N]);

  const currentObsMode = OBS_MODES.find(m => m.id === obsMode);

  return (
    <div className="app-layout">
      <TopNav onSelectPreset={handleSelectPreset} onOpenAdvanced={() => setShowAdvanced(true)} />
      <ObsTabs
        modes={OBS_MODES}
        activeMode={obsMode}
        onChangeMode={handleObsModeChange}
        description={currentObsMode?.desc}
        advancedOptions={advancedOptions}
        customObsIndices={customObsIndices}
        onToggleCustomObsIndex={handleToggleCustomObsIndex}
        onSelectAllCustomObs={handleSelectAllCustomObs}
        onClearAllCustomObs={handleClearAllCustomObs}
        onRandomCustomObs={handleRandomCustomObs}
      />

      <main className="app-main" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <ControlPanel
          methods={methods}
          colors={CHART_COLORS}
          onUpdateMethod={handleUpdateMethod}
          onRemoveMethod={handleRemoveMethod}
          onAddMethod={() => setShowAddMethod(true)}
          onRun={handleRun}
          onCsvExport={handleCsvExport}
          isRunning={isRunning}
          progress={progress}
          hasResults={!!simulationResults}
          needsRecalc={needsRecalc}
        />

        <VisualizationArea
          methods={methods}
          colors={CHART_COLORS}
          simulationResults={simulationResults}
          showRmse={showRmse}
          showSpread={showSpread}
          onToggleRmse={() => setShowRmse(v => !v)}
          onToggleSpread={() => setShowSpread(v => !v)}
          onUpdateMethod={handleUpdateMethod}
          activePreset={activePreset}
        />
      </main>

      {showAdvanced && (
        <AdvancedModal
          options={advancedOptions}
          obsMode={obsMode}
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
