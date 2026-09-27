/**
 * EduDA Translation Strings (Japanese & English)
 */

export const TRANSLATIONS = {
  ja: {
    // <head> (LanguageProvider が document.title / meta description に反映)
    pageTitle: "EduDA - データ同化シミュレータ | Lorenz '96で7手法を比較",
    pageDescription:
      "Lorenz '96カオスモデル上で7種類のデータ同化手法（EKF, POEnKF, EnSRF, LETKF, 3DVar, 4DVar, 粒子フィルタ）をリアルタイムに比較・可視化できる無料の教育用シミュレータ。インストール不要、ブラウザだけで動作します。",

    // TopNav
    appName: 'EduDA',
    csvBtn: 'CSV',
    csvTooltip: 'シミュレーション結果をCSV形式でダウンロード',
    advancedSettingsBtn: '詳細設定',

    // Observation Modes
    obsSectionTitle: '観測',
    obsPanel: {
      rangeStart: '観測範囲の始まり',
      rangeEnd: '観測範囲の終わり',
      count: '観測点の数',
      error: '観測の誤差 σ²',
      interval: '観測の間隔',
    },
    obsModes: {
      full: { label: '全観測', desc: '全40格子点を毎ステップ観測' },
      sparse: { label: '疎密観測', desc: '指定された連続領域（開始〜終了格子点）のみを集中観測' },
      thinned: { label: '間引き観測', desc: '全格子点を等間隔でサンプリング観測' },
    },
    obsActions: {
      pointsCount: '観測点',
      gridPoint: '格子点',
    },

    // ControlPanel
    controlPanel: {
      title: '比較する手法',
      addMethod: '比較手法を追加',
      sidebarCollapse: 'サイドバーを縮小',
      sidebarExpand: 'サイドバーを展開',
      emptyHint: '「比較手法を追加」から手法を選択してください',
      calculating: '計算中...',
      visibleTooltip: '表示中 - クリックで非表示',
      hiddenTooltip: '非表示 - クリックで表示',
      toggleVisibility: '表示切り替え',
    },

    // MethodCard
    methodCard: {
      duplicate: '複製して比べる',
      visibilityHide: '非表示にする',
      visibilityShow: '表示する',
      delete: '削除',
      showExplanation: '解説を表示',
      rmse: 'RMSE',
      spread: 'スプレッド',
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
      title: '詳細設定',
      close: '閉じる',
      generalSection: '一般設定',
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
      tabState1d: '真値と推定',
      tabHovmoller: '時空間の誤差',
      methodLabel: '手法:',
      step: 'Step',
      play: '再生',
      pause: '一時停止',
      stepBack: '1ステップ戻る',
      stepForward: '1ステップ進む',
      playbackSpeed: '再生速度',
      rmseSolid: 'RMSE',
      spreadDashed: 'スプレッド',
      // Chart datasets & axis
      chart: {
        truth: '真値',
        obs: '観測',
        timeStepAxis: 'タイムステップ',
        gridPointAxis: '格子点',
        rmseAxis: 'RMSE',
        stateAxis: '状態変数 x',
        obsErrorLine: '観測誤差 σo',
        divergenceStart: '発散',
      },
      // Hovmoller
      hovmoller: {
        gridAxis: '格子点',
        timeAxis: 'タイムステップ',
        lowError: '低誤差 (0.0)',
        highError: '高誤差',
      },
    },

    // Tooltip Drawer Sections
    tooltipDrawer: {
      explanation: '📖 直感的な解説',
      formula: '🧮 関連する数式表現',
      guideline: '💡 設定の目安・推奨値',
      close: '閉じる',
    },
  },

  en: {
    // <head> (applied to document.title / meta description by LanguageProvider)
    pageTitle: "EduDA - Data Assimilation Simulator | Compare 7 Methods on Lorenz '96",
    pageDescription:
      "A free educational simulator that compares and visualizes 7 data assimilation methods (EKF, POEnKF, EnSRF, LETKF, 3DVar, 4DVar, Particle Filter) in real time on the chaotic Lorenz '96 model. No installation - runs entirely in the browser.",

    // TopNav
    appName: 'EduDA',
    csvBtn: 'CSV',
    csvTooltip: 'Download simulation results as CSV',
    advancedSettingsBtn: 'Settings',

    // Observation Modes
    obsSectionTitle: 'Observation',
    obsPanel: {
      rangeStart: 'Range start',
      rangeEnd: 'Range end',
      count: 'Observed points',
      error: 'Obs. error σ²',
      interval: 'Obs. interval',
    },
    obsModes: {
      full: { label: 'Full Obs', desc: 'Observe all 40 grid points at every assimilation step' },
      sparse: { label: 'Sparse Obs', desc: 'Concentrate observations on configured contiguous grid region' },
      thinned: { label: 'Thinned Obs', desc: 'Sample grid points with equal spatial intervals' },
    },
    obsActions: {
      pointsCount: 'Obs Points',
      gridPoint: 'Grid',
    },

    // ControlPanel
    controlPanel: {
      title: 'Methods',
      addMethod: 'Add Method',
      sidebarCollapse: 'Collapse sidebar',
      sidebarExpand: 'Expand sidebar',
      emptyHint: 'Click "Add Method" to select and compare algorithms',
      calculating: 'Computing...',
      visibleTooltip: 'Visible - Click to hide',
      hiddenTooltip: 'Hidden - Click to show',
      toggleVisibility: 'Toggle visibility',
    },

    // MethodCard
    methodCard: {
      duplicate: 'Duplicate to compare',
      visibilityHide: 'Hide method',
      visibilityShow: 'Show method',
      delete: 'Delete',
      showExplanation: 'Show explanation',
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
      title: 'Settings',
      close: 'Close',
      generalSection: 'General Settings',
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
      tabState1d: 'Truth vs estimate',
      tabHovmoller: 'Error in space & time',
      methodLabel: 'Method:',
      step: 'Step',
      play: 'Play',
      pause: 'Pause',
      stepBack: 'Step Back',
      stepForward: 'Step Forward',
      playbackSpeed: 'Playback Speed',
      rmseSolid: 'RMSE',
      spreadDashed: 'Spread',
      // Chart datasets & axis
      chart: {
        truth: 'Truth (x_true)',
        obs: 'Observation (y)',
        timeStepAxis: 'Time Step',
        gridPointAxis: 'Grid point',
        rmseAxis: 'RMSE',
        stateAxis: 'State x',
        obsErrorLine: 'Obs. error σo',
        divergenceStart: 'Diverges',
      },
      // Hovmoller
      hovmoller: {
        gridAxis: 'Grid Point',
        timeAxis: 'Time Step',
        lowError: 'Low Error (0.0)',
        highError: 'High Error',
      },
    },

    // Tooltip Drawer Sections
    tooltipDrawer: {
      explanation: '📖 Intuitive Explanation',
      formula: '🧮 Mathematical Formulation',
      guideline: '💡 Guidelines & Recommendations',
      close: 'Close',
    },
  },
};
