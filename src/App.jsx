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
} from './constants';

export default function App() {
  // --- State ---
  const [obsMode, setObsMode] = useState('full');
  const [methods, setMethods] = useState(() => [
    createMethodInstance('EnKF'),
  ]);
  const [advancedOptions, setAdvancedOptions] = useState({ ...DEFAULT_ADVANCED });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAddMethod, setShowAddMethod] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [simulationResults, setSimulationResults] = useState(null);
  const [showRmse, setShowRmse] = useState(true);
  const [showSpread, setShowSpread] = useState(true);

  const workerRef = useRef(null);

  // --- Handlers ---
  const handleUpdateMethod = useCallback((instanceId, updates) => {
    setMethods(prev =>
      prev.map(m => m.instanceId === instanceId ? { ...m, ...updates } : m)
    );
  }, []);

  const handleRemoveMethod = useCallback((instanceId) => {
    setMethods(prev => prev.filter(m => m.instanceId !== instanceId));
  }, []);

  const handleAddMethod = useCallback((methodType) => {
    const instance = createMethodInstance(methodType);
    setMethods(prev => [...prev, instance]);
    setShowAddMethod(false);
  }, []);

  const handleRun = useCallback(() => {
    if (methods.length === 0) return;

    setIsRunning(true);
    setProgress(0);
    setSimulationResults(null);

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
        methods: methods.map(m => ({
          id: m.instanceId,
          type: m.type,
          params: m.params || {},
        })),
        observationMode: obsMode,
        advancedOptions,
      },
    });
  }, [methods, obsMode, advancedOptions]);

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
      <TopNav onOpenAdvanced={() => setShowAdvanced(true)} />
      <ObsTabs
        modes={OBS_MODES}
        activeMode={obsMode}
        onChangeMode={setObsMode}
        description={currentObsMode?.desc}
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
        />
      </main>

      {showAdvanced && (
        <AdvancedModal
          options={advancedOptions}
          obsMode={obsMode}
          onUpdate={setAdvancedOptions}
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
