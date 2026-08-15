/**
 * EduDA Translation Strings (Japanese & English)
 */

export const TRANSLATIONS = {
  ja: {
    // TopNav
    appName: 'EduDA',
    appSubtitle: 'Educational Data Assimilation',
    presetLabBtn: '🎓 プリセット実験ラボ',
    shareBtn: '共有',
    shareCopied: 'コピー完了!',
    shareTooltip: '現在の実験・設定URLをクリップボードにコピー',
    csvBtn: 'CSV',
    csvTooltip: 'シミュレーション結果をCSV形式でダウンロード',
    advancedSettingsBtn: '高度な設定',
    langToggle: 'English',

    // Observation Modes
    obsSectionTitle: '観測設定:',
    obsModes: {
      full: { label: '全観測', desc: '全40格子点を毎ステップ観測' },
      sparse: { label: '疎密観測', desc: '指定された連続領域（開始〜終了格子点）のみを集中観測' },
      thinned: { label: '間引き観測', desc: '全格子点を等間隔でサンプリング観測' },
    },
    obsActions: {
      pointsCount: '観測点',
      gridUnits: '格子点',
      gridPoint: '格子点',
      observed: '観測あり',
      unobserved: '未観測',
    },

    // ControlPanel
    controlPanel: {
      title: 'Methods',
      addMethod: '比較手法を追加',
      sidebarCollapse: 'サイドバーを縮小',
      sidebarExpand: 'サイドバーを展開',
      emptyHint: '「比較手法を追加」から手法を選択してください',
      runAssimilation: '同化を実行',
      recalculate: '再計算',
      calculating: '計算中...',
      exportCsv: 'CSVダウンロード',
      visibleTooltip: '表示中 - クリックで非表示',
      hiddenTooltip: '非表示 - クリックで表示',
      toggleVisibility: '表示切り替え',
    },

    // MethodCard
    methodCard: {
      visibilityHide: '非表示にする',
      visibilityShow: '表示する',
      menu: 'メニュー',
      delete: '削除',
      showExplanation: '解説を表示',
      diverged: '⚠️ 発散 (Diverged)',
      divergedTooltip: 'フィルター発散の説明を表示',
      rmse: 'RMSE',
      spread: 'Spread',
    },

    // AddMethodModal
    addMethodModal: {
      title: '比較手法を追加',
      close: '閉じる',
      categories: {
        kalman: 'カルマン系',
        ensemble: 'アンサンブル',
        variational: '変分法',
        particle: '粒子フィルタ',
      },
    },

    // AdvancedModal
    advancedModal: {
      title: '高度な設定',
      close: '閉じる',
      generalSection: '一般設定',
      sparseSection: '疎密観測設定',
      thinnedSection: '間引き観測設定',
      cancel: 'キャンセル',
      save: '保存',
      resetDefaults: '初期値にリセット',
      defaultHint: '初期値',
      fields: {
        N: '変数個数 (N)',
        F: '強制項 (F)',
        modelF: 'モデル誤差 (F_model)',
        obsErrorVar: '観測誤差分散 (σ²)',
        obsInterval: '観測間隔 (Δt_obs)',
        numSteps: 'シミュレーションステップ数',
        dt: '積分タイムステップ (dt)',
        sparseInterval: '疎密観測間隔',
        sparseRegionStart: '観測領域開始 (格子点)',
        sparseRegionEnd: '観測領域終了 (格子点)',
        thinNumObs: '観測数',
      },
    },

    // VisualizationArea
    visualization: {
      tabTimeseries: '時系列 (RMSE/Spread)',
      tabState1d: '1D 状態プロット',
      tabHovmoller: 'Hovmöller ダイヤグラム',
      methodLabel: '手法:',
      placeholder: '左側の「＋ 比較手法を追加」から手法を選択してください',
      stepSelect: 'タイムステップ選択:',
      step: 'Step',
      play: '再生',
      pause: '一時停止',
      stepBack: '1ステップ戻る',
      stepForward: '1ステップ進む',
      playbackSpeed: '再生速度',
      rmseSolid: 'RMSE (実線)',
      spreadDashed: 'Spread (破線)',
      // Chart datasets & axis
      chart: {
        truth: '真値 (Truth)',
        obs: '観測値 (Obs)',
        analysisSuffix: '解析値',
        timeStepAxis: 'タイムステップ (Time Step)',
        gridPointAxis: '空間格子点 (Grid Index: 1〜N)',
        rmseAxis: '二乗平均平方根誤差 (RMSE)',
        stateAxis: '状態変数値 (State Variable Value)',
      },
      // Hovmoller
      hovmoller: {
        gridAxis: 'Grid Point (格子点)',
        timeAxis: 'Time Step (タイムステップ)',
        lowError: '低誤差 (0.0)',
        highError: '高誤差',
      },
      // Preset Banner
      presetBanner: {
        theme: 'テーマ:',
        hideDetails: '説明を隠す',
        showDetails: '説明を表示',
      },
      // Summary Bar
      summary: {
        avgRmse: 'Avg RMSE',
        avgSpread: 'Avg Spread',
      },
    },

    // Tooltip Drawer Sections
    tooltipDrawer: {
      explanation: '📖 直感的な解説',
      explanationDivergence: '📖 フィルター発散とは',
      formula: '🧮 関連する数式表現',
      formulaDivergence: '🚨 主な発生理由',
      guideline: '💡 設定の目安・推奨値',
      guidelineDivergence: '💡 回避策・対策',
      close: '閉じる',
    },
  },

  en: {
    // TopNav
    appName: 'EduDA',
    appSubtitle: 'Educational Data Assimilation',
    presetLabBtn: '🎓 Preset Labs',
    shareBtn: 'Share',
    shareCopied: 'Copied!',
    shareTooltip: 'Copy current experiment URL to clipboard',
    csvBtn: 'CSV',
    csvTooltip: 'Download simulation results as CSV',
    advancedSettingsBtn: 'Advanced Settings',
    langToggle: '日本語',

    // Observation Modes
    obsSectionTitle: 'Obs Settings:',
    obsModes: {
      full: { label: 'Full Obs', desc: 'Observe all 40 grid points at every assimilation step' },
      sparse: { label: 'Sparse Obs', desc: 'Concentrate observations on configured contiguous grid region' },
      thinned: { label: 'Thinned Obs', desc: 'Sample grid points with equal spatial intervals' },
    },
    obsActions: {
      pointsCount: 'Obs Points',
      gridUnits: 'grid points',
      gridPoint: 'Grid',
      observed: 'Observed',
      unobserved: 'Unobserved',
    },

    // ControlPanel
    controlPanel: {
      title: 'Methods',
      addMethod: 'Add Method',
      sidebarCollapse: 'Collapse sidebar',
      sidebarExpand: 'Expand sidebar',
      emptyHint: 'Click "Add Method" to select and compare algorithms',
      runAssimilation: 'Run Assimilation',
      recalculate: 'Recalculate',
      calculating: 'Computing...',
      exportCsv: 'Export CSV',
      visibleTooltip: 'Visible - Click to hide',
      hiddenTooltip: 'Hidden - Click to show',
      toggleVisibility: 'Toggle visibility',
    },

    // MethodCard
    methodCard: {
      visibilityHide: 'Hide method',
      visibilityShow: 'Show method',
      menu: 'Menu',
      delete: 'Delete',
      showExplanation: 'Show explanation',
      diverged: '⚠️ Diverged',
      divergedTooltip: 'Show filter divergence explanation',
      rmse: 'RMSE',
      spread: 'Spread',
    },

    // AddMethodModal
    addMethodModal: {
      title: 'Add Assimilation Method',
      close: 'Close',
      categories: {
        kalman: 'Kalman',
        ensemble: 'Ensemble',
        variational: 'Variational',
        particle: 'Particle',
      },
    },

    // AdvancedModal
    advancedModal: {
      title: 'Advanced Settings',
      close: 'Close',
      generalSection: 'General Settings',
      sparseSection: 'Sparse Observation Settings',
      thinnedSection: 'Thinned Observation Settings',
      cancel: 'Cancel',
      save: 'Save',
      resetDefaults: 'Reset to Defaults',
      defaultHint: 'Default',
      fields: {
        N: 'Number of Variables (N)',
        F: 'Forcing Parameter (F)',
        modelF: 'Model Error (F_model)',
        obsErrorVar: 'Obs Error Variance (σ²)',
        obsInterval: 'Obs Interval (Δt_obs)',
        numSteps: 'Simulation Steps',
        dt: 'Integration Step (dt)',
        sparseInterval: 'Sparse Interval',
        sparseRegionStart: 'Sparse Region Start (Grid)',
        sparseRegionEnd: 'Sparse Region End (Grid)',
        thinNumObs: 'Number of Observations',
      },
    },

    // VisualizationArea
    visualization: {
      tabTimeseries: 'Time Series (RMSE/Spread)',
      tabState1d: '1D State Profile',
      tabHovmoller: 'Hovmöller Diagram',
      methodLabel: 'Method:',
      placeholder: 'Select a method from "+ Add Method" in the sidebar to start',
      stepSelect: 'Time Step Selection:',
      step: 'Step',
      play: 'Play',
      pause: 'Pause',
      stepBack: 'Step Back',
      stepForward: 'Step Forward',
      playbackSpeed: 'Playback Speed',
      rmseSolid: 'RMSE (Solid)',
      spreadDashed: 'Spread (Dashed)',
      // Chart datasets & axis
      chart: {
        truth: 'Truth (x_true)',
        obs: 'Observation (y)',
        analysisSuffix: 'Analysis',
        timeStepAxis: 'Time Step',
        gridPointAxis: 'Spatial Grid Point (1..N)',
        rmseAxis: 'Root Mean Square Error (RMSE)',
        stateAxis: 'State Variable Value (x)',
      },
      // Hovmoller
      hovmoller: {
        gridAxis: 'Grid Point',
        timeAxis: 'Time Step',
        lowError: 'Low Error (0.0)',
        highError: 'High Error',
      },
      // Preset Banner
      presetBanner: {
        theme: 'Theme:',
        hideDetails: 'Hide Details',
        showDetails: 'Show Details',
      },
      // Summary Bar
      summary: {
        avgRmse: 'Avg RMSE',
        avgSpread: 'Avg Spread',
      },
    },

    // Tooltip Drawer Sections
    tooltipDrawer: {
      explanation: '📖 Intuitive Explanation',
      explanationDivergence: '📖 What is Filter Divergence?',
      formula: '🧮 Mathematical Formulation',
      formulaDivergence: '🚨 Main Causes',
      guideline: '💡 Guidelines & Recommendations',
      guidelineDivergence: '💡 Remedies & Prevention',
      close: 'Close',
    },
  },
};
