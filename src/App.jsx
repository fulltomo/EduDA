import { useState, useCallback, useEffect, useRef } from 'react';
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
  PRESETS,
  getLocalizedPreset,
  createMethodInstance,
  createPresetMethodInstance,
} from './constants';
import { exportSimulationCsv } from './utils/csvExport';
import { useSimulationWorker } from './hooks/useSimulationWorker';
import { useLanguage } from './context/LanguageContext';

export default function App() {
  // --- State ---
  const [obsMode, setObsMode] = useState('full');
  const [methods, setMethods] = useState(() => [createMethodInstance('POEnKF')]);
  const [advancedOptions, setAdvancedOptions] = useState({ ...DEFAULT_ADVANCED });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAddMethod, setShowAddMethod] = useState(false);
  const [showRmse, setShowRmse] = useState(true);
  const [showSpread, setShowSpread] = useState(true);
  const [activePreset, setActivePreset] = useState(null);
  const initialMountRef = useRef(false);

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

  const { isRunning, progress, simulationResults, runSimulation } =
    useSimulationWorker(handleSimulationSuccess);

  // --- Auto-Run Simulation with Debounce (60ms) ---
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

  // --- Handlers ---
  const handleObsModeChange = useCallback((mode) => {
    setActivePreset(null);
    setObsMode(mode);
    triggerAutoRun(methods, mode, advancedOptions);
  }, [methods, advancedOptions, triggerAutoRun]);

  const handleUpdateAdvancedOptions = useCallback((options) => {
    setActivePreset(null);
    setAdvancedOptions(options);
    triggerAutoRun(methods, obsMode, options);
  }, [methods, obsMode, triggerAutoRun]);

  const handleUpdateMethod = useCallback((instanceId, updates) => {
    setActivePreset(null);
    setMethods(prev => {
      const next = prev.map(m => (m.instanceId === instanceId ? { ...m, ...updates } : m));
      return next;
    });
    setMethods(current => {
      triggerAutoRun(current, obsMode, advancedOptions);
      return current;
    });
  }, [obsMode, advancedOptions, triggerAutoRun]);

  const handleRemoveMethod = useCallback((instanceId) => {
    setActivePreset(null);
    setMethods(prev => {
      const next = prev.filter(m => m.instanceId !== instanceId);
      triggerAutoRun(next, obsMode, advancedOptions);
      return next;
    });
  }, [obsMode, advancedOptions, triggerAutoRun]);

  const handleAddMethod = useCallback((methodType) => {
    setActivePreset(null);
    const instance = createMethodInstance(methodType);
    setMethods(prev => {
      const next = [...prev, instance];
      return next;
    });
    triggerAutoRun([...methods, instance], obsMode, advancedOptions);
    setShowAddMethod(false);
  }, [methods, obsMode, advancedOptions, triggerAutoRun]);

  const handleRun = useCallback(() => {
    if (autoRunTimerRef.current) {
      clearTimeout(autoRunTimerRef.current);
      autoRunTimerRef.current = null;
    }
    runSimulation(methods, obsMode, advancedOptions, []);
  }, [runSimulation, methods, obsMode, advancedOptions]);

  const { lang, t } = useLanguage();

  const handleSelectPreset = useCallback((preset) => {
    if (autoRunTimerRef.current) {
      clearTimeout(autoRunTimerRef.current);
      autoRunTimerRef.current = null;
    }
    const locPreset = getLocalizedPreset(preset, lang);
    const instantiatedMethods = locPreset.methods.map(m =>
      createPresetMethodInstance(m.type, m.label, m.params)
    );
    const targetAdvanced = { ...DEFAULT_ADVANCED, ...preset.advancedOptions };

    setActivePreset(preset);
    setObsMode(preset.obsMode);
    setMethods(instantiatedMethods);
    setAdvancedOptions(targetAdvanced);

    runSimulation(instantiatedMethods, preset.obsMode, targetAdvanced, []);
  }, [lang, runSimulation]);

  // --- URL Search Params Deep-Linking Sync ---
  useEffect(() => {
    if (initialMountRef.current) return;
    initialMountRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const presetParam = params.get('preset');
    if (presetParam) {
      const lower = presetParam.toLowerCase();
      const found = PRESETS.find(
        p =>
          p.id.toLowerCase() === lower ||
          (lower === 'inflation' && p.id === 'preset1') ||
          (lower === 'localization' && p.id === 'preset2') ||
          ((lower === 'flow-dependent' || lower === '3dvar-letkf') && p.id === 'preset3') ||
          ((lower === 'pf' || lower === 'weight-collapse') && p.id === 'preset4')
      );
      if (found) {
        handleSelectPreset(found);
      }
    }
  }, [handleSelectPreset]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (activePreset) {
      url.searchParams.set('preset', activePreset.id);
    } else {
      url.searchParams.delete('preset');
    }
    const newSearch = url.searchParams.toString();
    const newUrl = url.pathname + (newSearch ? `?${newSearch}` : '');
    window.history.replaceState(null, '', newUrl);
  }, [activePreset]);

  const handleCsvExport = useCallback(() => {
    exportSimulationCsv(simulationResults, advancedOptions.N);
  }, [simulationResults, advancedOptions.N]);

  const currentObsMode = OBS_MODES.find(m => m.id === obsMode);
  const currentObsModeDesc = t(`obsModes.${obsMode}.desc`, currentObsMode?.desc);

  return (
    <div className="app-layout">
      {/* Navigation Header */}
      <TopNav
        onSelectPreset={handleSelectPreset}
        onOpenAdvanced={() => setShowAdvanced(true)}
        onCsvExport={handleCsvExport}
        hasResults={!!simulationResults}
      />

      {/* Observation Mode Tabs */}
      <ObsTabs
        modes={OBS_MODES}
        activeMode={obsMode}
        onChangeMode={handleObsModeChange}
        description={currentObsModeDesc}
        advancedOptions={advancedOptions}
      />

      {/* Main Content Area */}
      <main className="app-main" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <ControlPanel
          methods={methods}
          colors={CHART_COLORS}
          onUpdateMethod={handleUpdateMethod}
          onRemoveMethod={handleRemoveMethod}
          onAddMethod={() => setShowAddMethod(true)}
          onRun={handleRun}
          isRunning={isRunning}
          progress={progress}
        />

        <VisualizationArea
          methods={methods}
          colors={CHART_COLORS}
          simulationResults={simulationResults}
          showRmse={showRmse}
          showSpread={showSpread}
          onToggleRmse={() => setShowRmse(prev => !prev)}
          onToggleSpread={() => setShowSpread(prev => !prev)}
          activePreset={activePreset}
          isRunning={isRunning}
        />
      </main>

      {/* Modals */}
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
