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
  const [customObsIndices, setCustomObsIndices] = useState(() =>
    Array.from({ length: DEFAULT_ADVANCED.N }, (_, i) => i)
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAddMethod, setShowAddMethod] = useState(false);
  const [showRmse, setShowRmse] = useState(true);
  const [showSpread, setShowSpread] = useState(true);
  const [activePreset, setActivePreset] = useState(null);
  const [needsRecalc, setNeedsRecalc] = useState(false);
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

  // --- Handlers ---
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
    setCustomObsIndices(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index].sort((a, b) => a - b)
    );
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

  const handleUpdateMethod = useCallback((instanceId, updates) => {
    setActivePreset(null);
    setMethods(prev =>
      prev.map(m => (m.instanceId === instanceId ? { ...m, ...updates } : m))
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

  const handleRun = useCallback(() => {
    setNeedsRecalc(false);
    runSimulation(methods, obsMode, advancedOptions, customObsIndices);
  }, [runSimulation, methods, obsMode, advancedOptions, customObsIndices]);

  const { lang, t } = useLanguage();

  const handleSelectPreset = useCallback((preset) => {
    const locPreset = getLocalizedPreset(preset, lang);
    const instantiatedMethods = locPreset.methods.map(m =>
      createPresetMethodInstance(m.type, m.label, m.params)
    );
    const targetAdvanced = { ...DEFAULT_ADVANCED, ...preset.advancedOptions };

    setActivePreset(preset);
    setObsMode(preset.obsMode);
    setMethods(instantiatedMethods);
    setAdvancedOptions(targetAdvanced);
    setNeedsRecalc(false);

    runSimulation(instantiatedMethods, preset.obsMode, targetAdvanced, customObsIndices);
  }, [lang, runSimulation, customObsIndices]);

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
      {/* Top Navigation */}
      <TopNav
        onSelectPreset={handleSelectPreset}
        onOpenAdvanced={() => setShowAdvanced(true)}
      />

      {/* Observation Mode Tabs */}
      <ObsTabs
        modes={OBS_MODES}
        activeMode={obsMode}
        onChangeMode={handleObsModeChange}
        description={currentObsModeDesc}
        advancedOptions={advancedOptions}
        customObsIndices={customObsIndices}
        onToggleCustomObsIndex={handleToggleCustomObsIndex}
        onSelectAllCustomObs={handleSelectAllCustomObs}
        onClearAllCustomObs={handleClearAllCustomObs}
        onRandomCustomObs={handleRandomCustomObs}
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
          onCsvExport={handleCsvExport}
          hasResults={!!simulationResults}
          needsRecalc={needsRecalc}
        />

        <VisualizationArea
          methods={methods}
          colors={CHART_COLORS}
          simulationResults={simulationResults}
          showRmse={showRmse}
          showSpread={showSpread}
          onToggleRmse={() => setShowRmse(prev => !prev)}
          onToggleSpread={() => setShowSpread(prev => !prev)}
          onUpdateMethod={handleUpdateMethod}
          activePreset={activePreset}
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
