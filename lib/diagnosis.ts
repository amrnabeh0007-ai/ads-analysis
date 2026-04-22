import { DiagnosisIssue, DiagnosisOutput, MetricDefinition, NumericInput } from '@/lib/types';

const safeDiv = (num?: number, den?: number) => {
  if (num === undefined || den === undefined || den <= 0) return undefined;
  const value = num / den;
  return Number.isFinite(value) ? value : undefined;
};

const missing = (input: NumericInput, keys: Array<keyof NumericInput>) =>
  keys.filter((k) => input[k] === undefined).map((k) => String(k));

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

export const buildMetrics = (input: NumericInput): MetricDefinition[] => {
  return [
    withMetric('ctr', 'CTR', 'نسبة الضغط على الإعلان', 'Link Clicks / Impressions', 'بتقيس قد إيه الإعلان شد الناس وخلاهم يضغطوا.', safeDiv(input.linkClicks, input.impressions), missing(input, ['linkClicks', 'impressions'])),
    withMetric('cpc', 'CPC', 'تكلفة النقرة', 'Spend / Link Clicks', 'بتوضح تكلفة كل نقرة على الرابط.', safeDiv(input.spend, input.linkClicks), missing(input, ['spend', 'linkClicks']), false),
    withMetric('cpm', 'CPM', 'تكلفة الألف ظهور', '(Spend / Impressions) × 1000', 'بتوضح تكلفة الوصول لكل 1000 ظهور.', safeDiv(input.spend, input.impressions) !== undefined ? (safeDiv(input.spend, input.impressions) as number) * 1000 : undefined, missing(input, ['spend', 'impressions']), false),
    withMetric('lpvRate', 'Landing Page View Rate', 'نسبة الوصول للاند', 'Landing Page Views / Link Clicks', 'بتقيس كام واحد من اللي ضغطوا وصل فعلًا للصفحة.', safeDiv(input.landingPageViews, input.linkClicks), missing(input, ['landingPageViews', 'linkClicks'])),
    withMetric('costPerLpv', 'Cost per LPV', 'تكلفة الوصول للاند', 'Spend / Landing Page Views', 'بتوضح تكلفة كل زيارة فعلية لصفحة الهبوط.', safeDiv(input.spend, input.landingPageViews), missing(input, ['spend', 'landingPageViews']), false),
    withMetric('purchasesPerClick', 'Purchases per Click', 'مشتريات لكل نقرة', 'Purchases / Link Clicks', 'بتوضح نسبة الشراء من إجمالي النقرات.', safeDiv(input.purchases, input.linkClicks), missing(input, ['purchases', 'linkClicks'])),
    withMetric('landingCvr', 'Landing CVR', 'نسبة التحويل من اللاند', 'Purchases / Landing Page Views', 'بتقيس نسبة الشراء من الناس اللي فتحت اللاند.', safeDiv(input.purchases, input.landingPageViews), missing(input, ['purchases', 'landingPageViews'])),
    withMetric('cpa', 'CPA', 'تكلفة الشراء', 'Spend / Purchases', 'بتوضح تكلفة الحصول على طلب واحد.', safeDiv(input.spend, input.purchases), missing(input, ['spend', 'purchases']), false),
    withMetric('contentViewRate', 'Content View Rate', 'نسبة مشاهدة المحتوى', 'Content Views / Landing Page Views', 'بتقيس نسبة الوصول لمحتوى المنتج بعد فتح اللاند.', safeDiv(input.contentViews, input.landingPageViews), missing(input, ['contentViews', 'landingPageViews'])),
    withMetric('holdRate', 'Hold Rate', 'نسبة استكمال الفيديو', 'ThruPlays / Impressions', 'بتقيس قد إيه الناس كملت الفيديو.', safeDiv(input.thruPlays, input.impressions), missing(input, ['thruPlays', 'impressions'])),
    withMetric('videoAttentionProxy', 'Video Attention Proxy', 'مؤشر انتباه الفيديو (تقريبي)', 'Video Plays / Impressions', 'مؤشر تقريبي للانتباه وليس Hook Rate حقيقي.', safeDiv(input.videoPlays, input.impressions), missing(input, ['videoPlays', 'impressions'])),
    withMetric('hookRate', 'Hook Rate', 'الهُوك ريت', '3-second Video Plays / Impressions', 'بيقيس قدرة أول 3 ثواني على جذب الانتباه.', safeDiv(input.threeSecViews, input.impressions), missing(input, ['threeSecViews', 'impressions']))
  ];
};

const issue = (data: DiagnosisIssue): DiagnosisIssue => data;

export const buildDiagnosis = (
  input: NumericInput,
  metrics: MetricDefinition[],
  context: { hasAdLevelData: boolean; hasPurchases: boolean }
): DiagnosisOutput => {
  const ctr = metrics.find((m) => m.key === 'ctr')?.value;
  const lpvRate = metrics.find((m) => m.key === 'lpvRate')?.value;
  const landingCvr = metrics.find((m) => m.key === 'landingCvr')?.value;
  const checkoutRate = input.checkoutsInitiated !== undefined && input.landingPageViews !== undefined ? safeDiv(input.checkoutsInitiated, input.landingPageViews) : undefined;
  const issues: DiagnosisIssue[] = [];

  if (ctr !== undefined && ctr < 0.01) {
    issues.push(issue({
      titleEn: 'Low top-of-funnel click-through',
      titleAr: 'ضعف في أعلى الفانل (CTR منخفض)',
      primaryBottleneckEn: 'Creative/message is not generating enough clicks.',
      primaryBottleneckAr: 'الكريتف/الرسالة لا يجذبوا نقرات كفاية.',
      secondaryIssueEn: 'Audience-fit or offer framing may be weak.',
      secondaryIssueAr: 'ممكن يكون فيه عدم توافق جمهور أو عرض غير واضح.',
      evidenceEn: `CTR is ${(ctr * 100).toFixed(2)}%, below 1.00%.`,
      evidenceAr: `قيمة CTR هي ${(ctr * 100).toFixed(2)}% وده أقل من 1.00%.`,
      confidence: context.hasAdLevelData ? 'High' : 'Medium',
      likelyCausesEn: ['Weak opening hook', 'Unclear value proposition', 'Audience targeting drift'],
      likelyCausesAr: ['هوك البداية ضعيف', 'قيمة العرض غير واضحة', 'استهداف الجمهور غير دقيق'],
      nextActionEn: 'Launch 3-5 new creative angles and re-test CTR with same audience.',
      nextActionAr: 'اختبر 3-5 زوايا كريتف جديدة وأعد قياس CTR على نفس الجمهور.'
    }));
  }

  if (ctr !== undefined && ctr >= 0.01 && lpvRate !== undefined && lpvRate < 0.6) {
    issues.push(issue({
      titleEn: 'Click-to-landing friction',
      titleAr: 'احتكاك بين الضغط والوصول للاند',
      primaryBottleneckEn: 'Users click but fail to land successfully.',
      primaryBottleneckAr: 'الناس بتضغط لكن مش بتوصل للصفحة بشكل كافي.',
      secondaryIssueEn: 'Likely speed, redirect, or destination URL issues.',
      secondaryIssueAr: 'غالبًا مشكلة سرعة تحميل أو تحويلات أو رابط الوجهة.',
      evidenceEn: `CTR ${(ctr * 100).toFixed(2)}% with LPV rate ${(lpvRate * 100).toFixed(2)}%.`,
      evidenceAr: `CTR ${(ctr * 100).toFixed(2)}% بينما LPV Rate ${(lpvRate * 100).toFixed(2)}%.`,
      confidence: 'High',
      likelyCausesEn: ['Slow mobile page load', 'Broken redirects', 'Tracking mismatch'],
      likelyCausesAr: ['بطء تحميل الموبايل', 'تحويلات broken', 'اختلال في التتبع'],
      nextActionEn: 'Audit URL chain + page speed and fix landing load issues first.',
      nextActionAr: 'راجع سلسلة الروابط وسرعة الصفحة وأصلح مشاكل تحميل اللاند أولًا.'
    }));
  }

  if (lpvRate !== undefined && lpvRate >= 0.6 && landingCvr !== undefined && landingCvr < 0.015) {
    issues.push(issue({
      titleEn: 'Weak landing conversion',
      titleAr: 'ضعف التحويل داخل صفحة الهبوط',
      primaryBottleneckEn: 'Traffic quality/relevance is acceptable but conversion is weak.',
      primaryBottleneckAr: 'الوصول للاند جيد لكن الشراء ضعيف.',
      secondaryIssueEn: 'Offer, trust, pricing, or page clarity may be hurting CVR.',
      secondaryIssueAr: 'ممكن العرض أو الثقة أو السعر أو وضوح الصفحة سبب المشكلة.',
      evidenceEn: `LPV rate ${(lpvRate * 100).toFixed(2)}%, Landing CVR ${(landingCvr * 100).toFixed(2)}%.`,
      evidenceAr: `LPV Rate ${(lpvRate * 100).toFixed(2)}% وLanding CVR ${(landingCvr * 100).toFixed(2)}%.`,
      confidence: context.hasPurchases ? 'High' : 'Low',
      likelyCausesEn: ['Offer mismatch', 'Low trust signals', 'Price/fee shock'],
      likelyCausesAr: ['العرض غير مناسب', 'عناصر الثقة ضعيفة', 'صدمة سعر/تكاليف'],
      nextActionEn: 'Improve hero offer, social proof, and price transparency on landing.',
      nextActionAr: 'حسّن عرض البداية وإثباتات الثقة ووضوح السعر في اللاند.'
    }));
  }

  if (checkoutRate !== undefined && checkoutRate >= 0.1 && (input.purchases ?? 0) <= 0) {
    issues.push(issue({
      titleEn: 'Checkout drop-off before purchase',
      titleAr: 'تسرب في مرحلة الدفع قبل الشراء',
      primaryBottleneckEn: 'Users start checkout but do not complete payment.',
      primaryBottleneckAr: 'المستخدم يبدأ الدفع لكن لا يكمل الشراء.',
      secondaryIssueEn: 'Payment trust, shipping surprises, or checkout UX friction.',
      secondaryIssueAr: 'مشكلة ثقة في الدفع أو مفاجآت شحن أو احتكاك تجربة الدفع.',
      evidenceEn: `Checkout initiation rate ${(checkoutRate * 100).toFixed(2)}% with purchases ${(input.purchases ?? 0).toFixed(0)}.`,
      evidenceAr: `معدل بدء الدفع ${(checkoutRate * 100).toFixed(2)}% بينما عدد المشتريات ${(input.purchases ?? 0).toFixed(0)}.`,
      confidence: 'Medium',
      likelyCausesEn: ['Limited payment options', 'Unexpected shipping fees', 'Checkout form friction'],
      likelyCausesAr: ['خيارات دفع محدودة', 'رسوم شحن مفاجئة', 'احتكاك في نموذج الدفع'],
      nextActionEn: 'Run checkout QA end-to-end and remove payment/shipping blockers.',
      nextActionAr: 'نفّذ فحص شامل لمسار الدفع وأزل أي عوائق دفع/شحن.'
    }));
  }

  if (!issues.length) {
    issues.push(issue({
      titleEn: 'No strong bottleneck detected yet',
      titleAr: 'لا يوجد اختناق واضح حتى الآن',
      primaryBottleneckEn: 'Current dataset is not sufficient for a precise bottleneck.',
      primaryBottleneckAr: 'البيانات الحالية غير كافية لتحديد اختناق دقيق.',
      secondaryIssueEn: 'Missing fields reduce diagnostic certainty.',
      secondaryIssueAr: 'البيانات الناقصة تقلل دقة التشخيص.',
      evidenceEn: 'Key signals are missing or inconclusive.',
      evidenceAr: 'الإشارات الأساسية ناقصة أو غير حاسمة.',
      confidence: 'Low',
      likelyCausesEn: ['Incomplete dataset', 'Too short date range', 'Missing conversion tracking'],
      likelyCausesAr: ['البيانات غير مكتملة', 'فترة تحليل قصيرة جدًا', 'تتبع التحويل ناقص'],
      nextActionEn: 'Upload ad-level + campaign-level files and fill missing conversion fields.',
      nextActionAr: 'ارفع ملفات مستوى الكامبين والإعلان مع استكمال بيانات التحويل الناقصة.'
    }));
  }

  return { issues };
};
