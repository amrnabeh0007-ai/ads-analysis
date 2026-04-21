import { AdMetrics, BenchmarkSettings, BusinessInputs, DiagnosisItem, LandingPageAuditInput, Severity } from '@/lib/types';

export type ComputedMetrics = {
  cpa: number;
  roas: number;
  hookRate: number;
  holdRate: number;
  outboundCtr: number;
  lpvRate: number;
  purchasePerLinkClick: number;
  purchasePerOutboundClick: number;
  purchasePerLpv: number;
  lpToCheckoutRate: number;
  checkoutToPurchaseRate: number;
  costPerLpv: number;
  marginPerOrder: number;
  profitPerOrder: number;
  totalProfit: number;
};

const ratio = (num: number, den: number) => (den > 0 ? num / den : 0);

export const computeMetrics = (ad: AdMetrics, business: BusinessInputs): ComputedMetrics => {
  const revenue = ad.purchases * business.productPrice;
  const cpa = ratio(ad.spend, ad.purchases || 1);
  return {
    cpa,
    roas: ratio(revenue, ad.spend || 1),
    hookRate: ratio(ad.threeSecViews, ad.impressions),
    holdRate: ratio(ad.thruPlays, ad.impressions),
    outboundCtr: ratio(ad.uniqueOutboundClicks, ad.impressions),
    lpvRate: ratio(ad.landingPageViews, ad.linkClicks),
    purchasePerLinkClick: ratio(ad.purchases, ad.linkClicks),
    purchasePerOutboundClick: ratio(ad.purchases, ad.uniqueOutboundClicks),
    purchasePerLpv: ratio(ad.purchases, ad.landingPageViews),
    lpToCheckoutRate: ratio(ad.checkoutsInitiated, ad.landingPageViews),
    checkoutToPurchaseRate: ratio(ad.purchases, ad.checkoutsInitiated),
    costPerLpv: ratio(ad.spend, ad.landingPageViews),
    marginPerOrder: business.productPrice - business.productCost - business.shippingCost - business.operationsCost,
    profitPerOrder: business.productPrice - business.productCost - business.shippingCost - business.operationsCost - cpa,
    totalProfit: revenue - ad.spend - ad.purchases * (business.productCost + business.shippingCost + business.operationsCost)
  };
};

const sev = (badness: number): Severity => {
  if (badness > 0.5) return 'critical';
  if (badness > 0.3) return 'high';
  if (badness > 0.15) return 'medium';
  return 'low';
};

export const runDiagnosis = (ad: AdMetrics, b: BenchmarkSettings, computed: ComputedMetrics): DiagnosisItem[] => {
  const result: DiagnosisItem[] = [];
  if (computed.hookRate < b.hookRateMin) {
    result.push({
      id: 'hook',
      issueKey: 'weakHookIssue',
      reasonKey: 'weakHookReason',
      actionKey: 'weakHookAction',
      severity: sev((b.hookRateMin - computed.hookRate) / b.hookRateMin),
      evidence: `Hook Rate ${(computed.hookRate * 100).toFixed(1)}% vs benchmark ${(b.hookRateMin * 100).toFixed(1)}%`
    });
  }
  if (computed.hookRate >= b.hookRateMin && computed.holdRate < b.holdRateMin) {
    result.push({
      id: 'hold',
      issueKey: 'weakHoldIssue',
      reasonKey: 'weakHoldReason',
      actionKey: 'weakHoldAction',
      severity: sev((b.holdRateMin - computed.holdRate) / b.holdRateMin),
      evidence: `Hold Rate ${(computed.holdRate * 100).toFixed(1)}% vs benchmark ${(b.holdRateMin * 100).toFixed(1)}%`
    });
  }
  if (computed.outboundCtr < b.outboundCtrMin) {
    result.push({
      id: 'ctr',
      issueKey: 'weakCtrIssue',
      reasonKey: 'weakCtrReason',
      actionKey: 'weakCtrAction',
      severity: sev((b.outboundCtrMin - computed.outboundCtr) / b.outboundCtrMin),
      evidence: `Outbound CTR ${(computed.outboundCtr * 100).toFixed(2)}% vs benchmark ${(b.outboundCtrMin * 100).toFixed(2)}%`
    });
  }
  if (computed.lpvRate < b.lpvRateMin) {
    result.push({
      id: 'lpv',
      issueKey: 'weakLpvIssue',
      reasonKey: 'weakLpvReason',
      actionKey: 'weakLpvAction',
      severity: sev((b.lpvRateMin - computed.lpvRate) / b.lpvRateMin),
      evidence: `LPV Rate ${(computed.lpvRate * 100).toFixed(1)}% vs benchmark ${(b.lpvRateMin * 100).toFixed(1)}%`
    });
  }
  if (computed.purchasePerLpv < b.purchaseFromLpvMin) {
    result.push({
      id: 'lpv-purchase',
      issueKey: 'weakLpvPurchaseIssue',
      reasonKey: 'weakLpvPurchaseReason',
      actionKey: 'weakLpvPurchaseAction',
      severity: sev((b.purchaseFromLpvMin - computed.purchasePerLpv) / b.purchaseFromLpvMin),
      evidence: `Purchase/LPV ${(computed.purchasePerLpv * 100).toFixed(2)}% vs benchmark ${(b.purchaseFromLpvMin * 100).toFixed(2)}%`
    });
  }
  if (computed.lpToCheckoutRate > 0.1 && computed.checkoutToPurchaseRate < b.checkoutToPurchaseMin) {
    result.push({
      id: 'checkout',
      issueKey: 'checkoutFrictionIssue',
      reasonKey: 'checkoutFrictionReason',
      actionKey: 'checkoutFrictionAction',
      severity: sev((b.checkoutToPurchaseMin - computed.checkoutToPurchaseRate) / b.checkoutToPurchaseMin),
      evidence: `Checkout→Purchase ${(computed.checkoutToPurchaseRate * 100).toFixed(1)}% vs benchmark ${(b.checkoutToPurchaseMin * 100).toFixed(1)}%`
    });
  }
  return result.sort((a, c) => ({ low: 1, medium: 2, high: 3, critical: 4 }[c.severity] - { low: 1, medium: 2, high: 3, critical: 4 }[a.severity]));
};

export const landingPageScore = (audit: LandingPageAuditInput): number => {
  const values = [
    audit.pageSpeedScore,
    audit.mobileUsabilityScore,
    audit.headlineClarityScore,
    audit.ctaVisibilityScore,
    audit.trustElementsScore,
    audit.offerClarityScore,
    audit.structureFlowScore
  ];
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
};
