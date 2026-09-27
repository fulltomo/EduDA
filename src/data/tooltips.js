// ⓘ で出す一言説明。詳しい説明・式・目安は docs/{ja,en}/glossary.md（GitHub）に置き、
// 各キーはそのファイルのアンカー名と一致させる。
export const TOOLTIP_DATA = {
  inflation: {
    ja: ['インフレーション λ', 'アンサンブルのばらつきを毎回 λ 倍に広げ、予測の過信を防ぐ。上げすぎると解析が観測ノイズに振り回される。'],
    en: ['Inflation λ', 'Widens the ensemble spread by λ each step so the filter does not become overconfident. Too much and it chases observation noise.'],
  },
  localization: {
    ja: ['局所化半径 L', '観測が影響する範囲を近くの格子点に限る。メンバーが少ないときは小さめにする。'],
    en: ['Localization radius L', 'Limits each observation’s influence to nearby grid points. Use a smaller radius with fewer members.'],
  },
  processNoise: {
    ja: ['プロセスノイズ Q', 'モデルの予測をどれだけ疑うか。大きいほど観測を重視する。'],
    en: ['Process noise Q', 'How much the filter distrusts the model forecast. Larger values lean more on observations.'],
  },
  bgErrorVar: {
    ja: ['背景誤差分散 σb²', '予測（背景）をどれだけ疑うか。観測誤差より大きいと観測寄りの解析になる。'],
    en: ['Background error variance σb²', 'How much the forecast is distrusted. Larger than the observation error means the analysis leans on observations.'],
  },
  filterType: {
    ja: ['方式', 'LPF は 40 変数でも動く局所化版。SIR は素朴な粒子フィルタで、すぐ破綻する様子を見られる。'],
    en: ['Algorithm', 'LPF is a localized version that works on 40 variables. Plain SIR collapses quickly, which is instructive.'],
  },
  resampleThreshold: {
    ja: ['リサンプリング閾値', '有効な粒子の割合がこれを下回ると粒子を選び直す。'],
    en: ['Resample threshold', 'Particles are resampled when the effective fraction falls below this value.'],
  },
  rmse: {
    ja: ['RMSE', '推定と真値のずれの大きさ。観測誤差 σo の線より下にあれば同化が効いている。'],
    en: ['RMSE', 'How far the estimate is from the truth. Below the σo line means assimilation is working.'],
  },
  spread: {
    ja: ['スプレッド', 'アンサンブル自身が見積もる不確かさ。RMSE と同じくらいが理想で、ずっと小さいと過信。'],
    en: ['Spread', 'The uncertainty the ensemble reports about itself. Ideally close to RMSE; much smaller means overconfidence.'],
  },
  ensembleSize: {
    ja: ['メンバー数 M', 'アンサンブル（粒子）の数。増やすと精度は上がるが計算が重くなる。'],
    en: ['Ensemble size M', 'Number of members or particles. More is more accurate but slower.'],
  },
  corrLength: {
    ja: ['相関距離 L', '予測の誤差が何格子点先まで連動すると仮定するか。観測がまばらなときほど効く。'],
    en: ['Correlation length L', 'How far forecast errors are assumed to be correlated. Matters most with sparse observations.'],
  },
  windowSize: {
    ja: ['同化ウィンドウ', '何ステップ分の観測をまとめて合わせるか。長すぎると最適化が収束しにくい。'],
    en: ['Assimilation window', 'How many steps of observations are fitted at once. Too long and the optimization struggles.'],
  },
  N: {
    ja: ['格子点数 N', '円周上に並ぶ変数の数。増やすと次元が上がり、特に粒子フィルタが苦しくなる。'],
    en: ['Grid points N', 'Number of variables around the ring. More dimensions are harder, especially for particle filters.'],
  },
  F: {
    ja: ['外力 F（真値）', '真値を作るモデルの強制項。8 付近でカオスになる。'],
    en: ['Forcing F (truth)', 'Forcing of the model that generates the truth. Chaotic around 8.'],
  },
  modelF: {
    ja: ['外力 F（予測モデル）', '予測に使うモデルの強制項。真値の F と変えるとモデル誤差を入れられる。'],
    en: ['Forcing F (forecast model)', 'Forcing of the forecast model. Set it apart from the truth F to add model error.'],
  },
  obsErrorVar: {
    ja: ['観測誤差 σ²', '観測に乗るノイズの大きさ。小さいほど解析は観測に近づく。'],
    en: ['Observation error σ²', 'Noise added to observations. Smaller values pull the analysis toward observations.'],
  },
  obsInterval: {
    ja: ['観測間隔', '何ステップごとに観測するか。空けすぎるとカオスで誤差が育ち、追従できなくなる。'],
    en: ['Observation interval', 'Observe every this many steps. Too wide a gap lets chaotic error grow beyond recovery.'],
  },
  numSteps: {
    ja: ['ステップ数', '計算する時間の長さ。増やすと計算が重くなる。'],
    en: ['Steps', 'Length of the run. More steps take longer to compute.'],
  },
  dt: {
    ja: ['時間刻み dt', '1 ステップの時間。0.05 で大気のおよそ 6 時間。'],
    en: ['Time step dt', 'Time per step. 0.05 is roughly 6 hours of atmosphere.'],
  },
  sparseRegionStart: {
    ja: ['観測範囲の始まり', 'この格子点から観測する。'],
    en: ['Observed range start', 'Observations start at this grid point.'],
  },
  sparseRegionEnd: {
    ja: ['観測範囲の終わり', 'この格子点まで観測する。'],
    en: ['Observed range end', 'Observations end at this grid point.'],
  },
  thinNumObs: {
    ja: ['観測点数', '円周上に等間隔で置く観測点の数。'],
    en: ['Observation points', 'Number of evenly spaced observation points around the ring.'],
  },
};

export const DOCS_URL = 'https://github.com/fulltomo/EduDA/blob/main/docs';

export function getLocalizedTooltip(paramId, lang = 'ja') {
  const item = TOOLTIP_DATA[paramId];
  if (!item) return null;
  const l = lang === 'en' ? 'en' : 'ja';
  const [title, text] = item[l];
  return { title, text, href: `${DOCS_URL}/${l}/glossary.md#${paramId}` };
}
