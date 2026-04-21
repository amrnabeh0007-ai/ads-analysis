import { AdMetrics, BenchmarkSettings, BusinessInputs, DemoScenario, LandingPageAuditInput } from '@/lib/types';

export const defaultMetrics: AdMetrics = {
  spend: 4200,
  purchases: 58,
  impressions: 325000,
  threeSecViews: 60500,
  thruPlays: 19800,
  linkClicks: 8200,
  uniqueOutboundClicks: 6400,
  landingPageViews: 4100,
  checkoutsInitiated: 620,
  contentViews: 5200,
  costPerResult: 72.4
};

export const defaultBusiness: BusinessInputs = {
  productPrice: 74,
  productCost: 22,
  shippingCost: 7,
  operationsCost: 8,
  breakEvenCPA: 37,
  targetROAS: 2.2,
  targetProfitMargin: 20
};

export const defaultBenchmarks: BenchmarkSettings = {
  hookRateMin: 0.2,
  holdRateMin: 0.08,
  outboundCtrMin: 0.012,
  lpvRateMin: 0.55,
  purchaseFromLpvMin: 0.02,
  checkoutToPurchaseMin: 0.45
};

export const defaultAudit: LandingPageAuditInput = {
  url: 'https://example-store.com/products/hero-product',
  pageSpeedScore: 56,
  mobileUsabilityScore: 62,
  headlineClarityScore: 72,
  ctaVisibilityScore: 61,
  trustElementsScore: 48,
  offerClarityScore: 59,
  structureFlowScore: 65
};

export const demoScenarios: DemoScenario[] = [
  {
    id: 'weak-hook',
    labelKey: 'scenarios.weakHook.label',
    descriptionKey: 'scenarios.weakHook.description',
    metrics: { ...defaultMetrics, threeSecViews: 30000, thruPlays: 12000, linkClicks: 5100 },
    audit: defaultAudit
  },
  {
    id: 'weak-hold',
    labelKey: 'scenarios.weakHold.label',
    descriptionKey: 'scenarios.weakHold.description',
    metrics: { ...defaultMetrics, threeSecViews: 70000, thruPlays: 11000 },
    audit: defaultAudit
  },
  {
    id: 'weak-lpv',
    labelKey: 'scenarios.weakLpv.label',
    descriptionKey: 'scenarios.weakLpv.description',
    metrics: { ...defaultMetrics, linkClicks: 9000, landingPageViews: 2800 },
    audit: { ...defaultAudit, pageSpeedScore: 39, mobileUsabilityScore: 44 }
  },
  {
    id: 'checkout-friction',
    labelKey: 'scenarios.checkoutFriction.label',
    descriptionKey: 'scenarios.checkoutFriction.description',
    metrics: { ...defaultMetrics, checkoutsInitiated: 760, purchases: 40 },
    audit: defaultAudit
  },
  {
    id: 'strong-creative-weak-lp',
    labelKey: 'scenarios.strongCreativeWeakLp.label',
    descriptionKey: 'scenarios.strongCreativeWeakLp.description',
    metrics: { ...defaultMetrics, threeSecViews: 74000, thruPlays: 34000, linkClicks: 9800, landingPageViews: 3500, purchases: 38 },
    audit: { ...defaultAudit, trustElementsScore: 38, offerClarityScore: 41, pageSpeedScore: 47 }
  }
];
