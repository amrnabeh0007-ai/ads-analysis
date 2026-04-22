import { DiagnosisOutput, MetricDefinition } from '@/lib/types';

type NumericInput = Record<string, number | undefined>;

const safeDiv = (num?: number, den?: number) => {
  if (num === undefined || den === undefined || den <= 0) return undefined;
  const v = num / den;
  return Number.isFinite(v) ? v : undefined;
};

const withMetric = (
  key: string,
  labelEn: string,
  labelAr: string,
  formula: string,
  tooltipAr: string,
  value: number | undefined,
  missingFields: string[],
  percentage = true
): MetricDefinition => ({
  key,
  labelEn,
  labelAr,
  formula,
  tooltipAr,
  value,
  percentage,
  missingFields
});

const missing = (input: NumericInput, keys: string[]) => keys.filter((k) => input[k] === undefined);

export const buildMetrics = (input: NumericInput): MetricDefinition[] => {
  const ctrMissing = missing(input, ['linkClicks', 'impressions']);
  const cpcMissing = missing(input, ['spend', 'linkClicks']);
  const cpmMissing = missing(input, ['spend', 'impressions']);
  const lpvRateMissing = missing(input, ['landingPageViews', 'linkClicks']);
  const pplcMissing = missing(input, ['purchases', 'linkClicks']);
  const landingCvrMissing = missing(input, ['purchases', 'landingPageViews']);
  const ppuocMissing = missing(input, ['purchases', 'uniqueOutboundClicks']);
  const checkoutRateMissing = missing(input, ['checkoutsInitiated', 'landingPageViews']);
  const costPerLpvMissing = missing(input, ['spend', 'landingPageViews']);
  const cpaMissing = missing(input, ['spend', 'purchases']);
  const hookMissing = missing(input, ['threeSecViews', 'impressions']);
  const holdMissing = missing(input, ['thruPlays', 'impressions']);

  return [
    withMetric('ctr', 'CTR', 'نسبة الضغط على الإعلان', 'Link Clicks / Impressions', 'بتقيس قوة الكريتف والرسالة الإعلانية.', safeDiv(input.linkClicks, input.impressions), ctrMissing),
    withMetric('cpc', 'CPC', 'تكلفة النقرة', 'Spend / Link Clicks', 'تكلفة كل ضغطة على الإعلان.', safeDiv(input.spend, input.linkClicks), cpcMissing, false),
    withMetric('cpm', 'CPM', 'تكلفة الألف ظهور', '(Spend / Impressions) × 1000', 'تكلفة وصول الإعلان لكل 1000 ظهور.', safeDiv(input.spend, input.impressions) !== undefined ? (safeDiv(input.spend, input.impressions) as number) * 1000 : undefined, cpmMissing, false),
    withMetric('lpvRate', 'Landing Page View Rate', 'نسبة دخول اللاند', 'Landing Page Views / Link Clicks', 'لو قليلة غالبًا فيه بطء تحميل أو مشكلة انتقال.', safeDiv(input.landingPageViews, input.linkClicks), lpvRateMissing),
    withMetric('purchasesPerClick', 'Purchases per Link Click', 'مشتريات لكل نقرة', 'Purchases / Link Clicks', 'مؤشر أولي على جودة الفانل بعد النقر.', safeDiv(input.purchases, input.linkClicks), pplcMissing),
    withMetric('landingCvr', 'Landing CVR', 'معدل التحويل من اللاند', 'Purchases / Landing Page Views', 'أهم مؤشر لقوة اللاند + العرض.', safeDiv(input.purchases, input.landingPageViews), landingCvrMissing),
    withMetric('purchasesPerOutbound', 'Purchases per Unique Outbound Click', 'مشتريات لكل Outbound', 'Purchases / Unique Outbound Clicks', 'مفيد لو عمود outbound متاح.', safeDiv(input.purchases, input.uniqueOutboundClicks), ppuocMissing),
    withMetric('checkoutRate', 'LP-to-Checkout Rate', 'معدل بدء الدفع من اللاند', 'Checkouts Initiated / Landing Page Views', 'لو قليل = عرض غير مقنع أو ثقة ضعيفة.', safeDiv(input.checkoutsInitiated, input.landingPageViews), checkoutRateMissing),
    withMetric('costPerLpv', 'Cost per LPV', 'تكلفة دخول اللاند', 'Spend / Landing Page Views', 'تكلفة وصول زائر واحد لصفحة الهبوط.', safeDiv(input.spend, input.landingPageViews), costPerLpvMissing, false),
    withMetric('cpa', 'Cost per Purchase (CPA)', 'تكلفة الشراء', 'Spend / Purchases', 'أهم رقم للحكم على الربحية.', safeDiv(input.spend, input.purchases), cpaMissing, false),
    withMetric('hookRate', 'Hook Rate', 'معدل الهوك', '3-sec video plays / Impressions', 'قدرة أول 3 ثواني على إيقاف التمرير.', safeDiv(input.threeSecViews, input.impressions), hookMissing),
    withMetric('holdRate', 'Hold Rate', 'معدل الاستمرار', 'ThruPlays / Impressions', 'نسبة من كملوا الفيديو.', safeDiv(input.thruPlays, input.impressions), holdMissing)
  ];
};

export const buildDiagnosis = (input: NumericInput, metrics: MetricDefinition[]): DiagnosisOutput => {
  const ctr = metrics.find((m) => m.key === 'ctr')?.value;
  const lpvRate = metrics.find((m) => m.key === 'lpvRate')?.value;
  const landingCvr = metrics.find((m) => m.key === 'landingCvr')?.value;
  const checkoutRate = metrics.find((m) => m.key === 'checkoutRate')?.value;

  let mainEn = 'Insufficient data for a high-confidence diagnosis.';
  let mainAr = 'البيانات غير كافية لتشخيص عالي الثقة.';
  let secondaryEn = 'Upload more columns or enter missing values manually.';
  let secondaryAr = 'ارفع أعمدة إضافية أو أدخل القيم الناقصة يدويًا.';
  let confidence: DiagnosisOutput['confidence'] = 'Low';

  if (ctr !== undefined && ctr < 0.01) {
    mainEn = 'Low CTR: likely creative/copy/angle issue.';
    mainAr = 'CTR منخفض: غالبًا مشكلة في الكريتف أو الرسالة.';
    secondaryEn = 'Test new hooks, stronger offer framing, and clearer CTA.';
    secondaryAr = 'اختبر هوكات جديدة وصياغة عرض أوضح وCTA أقوى.';
    confidence = 'High';
  }

  if (ctr !== undefined && ctr >= 0.01 && lpvRate !== undefined && lpvRate < 0.6) {
    mainEn = 'Good CTR + low LPV rate: likely landing speed/loading friction.';
    mainAr = 'CTR جيد مع LPV منخفض: غالبًا بطء تحميل أو احتكاك تقني.';
    secondaryEn = 'Audit mobile load speed, redirects, and broken destination URLs.';
    secondaryAr = 'راجع سرعة الموبايل والتحويلات والروابط النهائية.';
    confidence = 'High';
  }

  if (lpvRate !== undefined && lpvRate >= 0.6 && landingCvr !== undefined && landingCvr < 0.015) {
    mainEn = 'Traffic reaches landing page but conversion is weak.';
    mainAr = 'الزيارات تصل للاند لكن التحويل ضعيف.';
    secondaryEn = 'Likely offer/price/trust issues on landing page.';
    secondaryAr = 'غالبًا مشكلة عرض أو سعر أو ثقة في اللاند.';
    confidence = 'High';
  }

  if (checkoutRate !== undefined && checkoutRate >= 0.1 && input.purchases !== undefined && input.purchases === 0) {
    mainEn = 'Checkout started but purchases are zero: checkout/payment friction.';
    mainAr = 'فيه بدء دفع لكن بدون مشتريات: مشكلة دفع/ثقة/شحن.';
    secondaryEn = 'Review payment methods, shipping surprises, and trust signals.';
    secondaryAr = 'راجع طرق الدفع ومفاجآت الشحن وعناصر الثقة.';
    confidence = 'Medium';
  }

  return {
    mainDiagnosisEn: mainEn,
    mainDiagnosisAr: mainAr,
    secondaryDiagnosisEn: secondaryEn,
    secondaryDiagnosisAr: secondaryAr,
    confidence,
    nextActionsEn: [
      'Fix the primary bottleneck first and rerun the same date range.',
      'Do not optimize on unavailable metrics; complete missing fields.',
      'Change one variable at a time to keep diagnosis reliable.'
    ],
    nextActionsAr: [
      'ابدأ بإصلاح الاختناق الأساسي ثم أعد التحليل لنفس الفترة.',
      'لا تُحسّن على مؤشرات غير متاحة؛ أكمل البيانات الناقصة.',
      'غيّر عنصرًا واحدًا كل مرة للحفاظ على دقة التشخيص.'
    ]
  };
};
