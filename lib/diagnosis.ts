import { CsvMapping, DiagnosisOutput, FinalDecision, FunnelMetrics, MissingMetric } from '@/lib/types';

const ratio = (num: number, den: number) => (den > 0 ? num / den : undefined);

const hasColumn = (mapping: CsvMapping, key: keyof CsvMapping) => Boolean(mapping[key]);

export const detectMissingMetrics = (mapping: CsvMapping): MissingMetric[] => {
  const missing: MissingMetric[] = [];

  if (!hasColumn(mapping, 'purchases') || !hasColumn(mapping, 'linkClicks')) {
    missing.push({
      key: 'purchasePerLinkClick',
      label: 'Purchases ÷ Link clicks',
      missingFields: [!hasColumn(mapping, 'purchases') ? 'purchases' : '', !hasColumn(mapping, 'linkClicks') ? 'linkClicks' : ''].filter(Boolean)
    });
  }

  if (!hasColumn(mapping, 'purchases') || !hasColumn(mapping, 'landingPageViews')) {
    missing.push({
      key: 'purchasePerLandingPageView',
      label: 'Purchases ÷ Landing page views',
      missingFields: [!hasColumn(mapping, 'purchases') ? 'purchases' : '', !hasColumn(mapping, 'landingPageViews') ? 'landingPageViews' : ''].filter(Boolean)
    });
  }

  if (!hasColumn(mapping, 'landingPageViews') || !hasColumn(mapping, 'linkClicks')) {
    missing.push({
      key: 'landingPageViewRate',
      label: 'Landing page view rate',
      missingFields: [!hasColumn(mapping, 'landingPageViews') ? 'landingPageViews' : '', !hasColumn(mapping, 'linkClicks') ? 'linkClicks' : ''].filter(Boolean)
    });
  }

  if (!hasColumn(mapping, 'costPerResult') && !(hasColumn(mapping, 'spend') && hasColumn(mapping, 'purchases'))) {
    missing.push({
      key: 'costPerResult',
      label: 'Cost per result',
      missingFields: ['costPerResult or (spend + purchases)']
    });
  }

  return missing;
};

export const calculateFunnelMetrics = (input: { purchases: number; linkClicks: number; landingPageViews: number; costPerResult: number }): FunnelMetrics => ({
  purchasePerLinkClick: ratio(input.purchases, input.linkClicks),
  purchasePerLandingPageView: ratio(input.purchases, input.landingPageViews),
  landingPageViewRate: ratio(input.landingPageViews, input.linkClicks),
  costPerResult: input.costPerResult > 0 ? input.costPerResult : undefined
});

const pct = (value?: number) => (value === undefined ? 'n/a' : `${(value * 100).toFixed(2)}%`);

export const runDiagnosisEngine = (metrics: FunnelMetrics, missingCount: number): DiagnosisOutput => {
  const reasoning: string[] = [];
  const candidates: { id: string; score: number; reason: string; fix: string }[] = [];

  if (metrics.purchasePerLandingPageView !== undefined) {
    const score = Math.max(0, 0.03 - metrics.purchasePerLandingPageView);
    candidates.push({
      id: 'landing-conversion',
      score,
      reason: `Purchases ÷ LPV is ${pct(metrics.purchasePerLandingPageView)}.`,
      fix: 'Improve landing page trust, offer clarity, and checkout reassurance.'
    });
  }

  if (metrics.landingPageViewRate !== undefined) {
    const score = Math.max(0, 0.65 - metrics.landingPageViewRate);
    candidates.push({
      id: 'post-click-drop',
      score,
      reason: `LPV rate is ${pct(metrics.landingPageViewRate)} which indicates post-click drop-off.`,
      fix: 'Improve page speed, reduce redirects, and validate URL/deep-link setup.'
    });
  }

  if (metrics.purchasePerLinkClick !== undefined) {
    const score = Math.max(0, 0.02 - metrics.purchasePerLinkClick);
    candidates.push({
      id: 'click-quality-or-offer',
      score,
      reason: `Purchases ÷ link clicks is ${pct(metrics.purchasePerLinkClick)}.`,
      fix: 'Tighten audience/ad message match and align ad promise with landing offer.'
    });
  }

  if (metrics.costPerResult !== undefined) {
    const score = metrics.costPerResult > 80 ? Math.min(1, (metrics.costPerResult - 80) / 80) : 0;
    candidates.push({
      id: 'cost-efficiency',
      score,
      reason: `Cost per result is ${metrics.costPerResult.toFixed(2)}.`,
      fix: 'Pause expensive creatives and reallocate to better converting segments.'
    });
  }

  const sorted = candidates.sort((a, b) => b.score - a.score);
  const main = sorted[0];
  const secondary = sorted[1];

  if (main) reasoning.push(main.reason);
  if (secondary) reasoning.push(secondary.reason);
  if (!main) reasoning.push('Not enough data to identify a bottleneck.');

  const confidenceBase = Math.max(0.2, 1 - missingCount * 0.2);
  const confidence = Math.min(0.97, Number((main ? confidenceBase : 0.25).toFixed(2)));

  return {
    mainProblem: main ? main.id : 'insufficient-data',
    secondaryProblem: secondary ? secondary.id : 'none',
    confidence,
    reasoning,
    fixes: [main?.fix, secondary?.fix].filter(Boolean) as string[]
  };
};

export const runDecisionEngine = (metrics: FunnelMetrics, diagnosis: DiagnosisOutput): FinalDecision => {
  const lpvToPurchase = metrics.purchasePerLandingPageView ?? 0;
  const clickToPurchase = metrics.purchasePerLinkClick ?? 0;
  const lpvRate = metrics.landingPageViewRate ?? 0;

  let decision: FinalDecision['decision'] = 'hold';
  if (lpvToPurchase >= 0.03 && lpvRate >= 0.7) decision = 'scale';
  if (lpvToPurchase < 0.01 || clickToPurchase < 0.005) decision = 'kill';

  return {
    decision,
    mainBottleneck: diagnosis.mainProblem,
    nextActions: [
      diagnosis.fixes[0] ?? 'Complete missing columns and rerun analysis.',
      'Validate tracking consistency for clicks, LPV, and purchases over the same date range.',
      'Test one change at a time and re-evaluate after statistically meaningful spend.'
    ]
  };
};
