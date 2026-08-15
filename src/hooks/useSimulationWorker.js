import { useState, useRef, useCallback } from 'react';

/**
 * Custom hook to manage Web Worker simulation execution and progress
 */
export function useSimulationWorker(onSuccess) {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [simulationResults, setSimulationResults] = useState(null);
  const workerRef = useRef(null);

  const runSimulation = useCallback((targetMethods, targetObsMode, targetAdvanced, targetCustomObsIndices) => {
    if (!targetMethods || targetMethods.length === 0) {
      setSimulationResults(null);
      setIsRunning(false);
      return;
    }

    setIsRunning(true);
    setProgress(0);
    setSimulationResults(null);

    // Terminate existing worker if active
    if (workerRef.current) {
      workerRef.current.terminate();
    }

    const worker = new Worker(
      new URL('../workers/daWorker.js', import.meta.url),
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
        if (onSuccess) {
          onSuccess(payload);
        }
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
  }, [onSuccess]);

  return {
    isRunning,
    progress,
    simulationResults,
    runSimulation,
  };
}
