/**
 * Export simulation results to CSV and trigger file download
 */
export function exportSimulationCsv(simulationResults, N) {
  if (!simulationResults) return;

  const { results } = simulationResults;
  if (!results || results.length === 0) return;

  const first = results[0];
  const steps = first.timeSteps;

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
  a.download = `eduda_simulation_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
