export type Lang = 'en' | 'ar';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export type AdMetrics = {
  spend: number;
  purchases: number;
  impressions: number;
  threeSecViews: number;
  thruPlays: number;
  linkClicks: number;
  uniqueOutboundClicks: number;
  landingPageViews: number;
  checkoutsInitiated: number;
  contentViews: number;
  costPerResult: number;
};

export type BusinessInputs = {
  productPrice: number;
  productCost: number;
  shippingCost: number;
  operationsCost: number;
  breakEvenCPA: number;
  targetROAS: number;
  targetProfitMargin: number;
};

export type BenchmarkSettings = {
  hookRateMin: number;
  holdRateMin: number;
  outboundCtrMin: number;
  lpvRateMin: number;
  purchaseFromLpvMin: number;
  checkoutToPurchaseMin: number;
};

export type LandingPageAuditInput = {
  url: string;
  pageSpeedScore: number;
  mobileUsabilityScore: number;
  headlineClarityScore: number;
  ctaVisibilityScore: number;
  trustElementsScore: number;
  offerClarityScore: number;
  structureFlowScore: number;
};

export type DiagnosisItem = {
  id: string;
  issueKey: string;
  reasonKey: string;
  actionKey: string;
  severity: Severity;
  evidence: string;
};

export type DemoScenario = {
  id: string;
  labelKey: string;
  descriptionKey: string;
  metrics: AdMetrics;
  audit: LandingPageAuditInput;
};
