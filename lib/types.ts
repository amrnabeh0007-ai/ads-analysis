export type DataMode = 'demo' | 'uploaded';


export type AdMetrics = {
  spend: number;
  purchases: number;
  linkClicks: number;
  landingPageViews: number;
  costPerResult: number;
};

export type CsvField =
  | 'productName'
  | 'campaignName'
  | 'adSetName'
  | 'adName'
  | 'spend'
  | 'impressions'
  | 'linkClicks'
  | 'landingPageViews'
  | 'purchases'
  | 'costPerResult'
  | 'checkoutsInitiated'
  | 'threeSecViews'
  | 'thruPlays'
  | 'uniqueOutboundClicks'
  | 'contentViews'
  | 'landingPageUrl'
  | 'productCost'
  | 'shippingCost'
  | 'operationsCost'
  | 'ctr'
  | 'cpc'
  | 'cpm'
  | 'videoPlays';

export type CsvMapping = Partial<Record<CsvField, string>>;

export type MappingConfidence = 'high' | 'medium' | 'low';

export type MappingResult = {
  column?: string;
  confidence: MappingConfidence;
  reason: string;
};

export type MetricDefinition = {
  key: string;
  labelEn: string;
  labelAr: string;
  formula: string;
  tooltipAr: string;
  value?: number;
  percentage?: boolean;
  missingFields: string[];
};

export type DiagnosisIssue = {
  titleEn: string;
  titleAr: string;
  primaryBottleneckEn: string;
  primaryBottleneckAr: string;
  secondaryIssueEn: string;
  secondaryIssueAr: string;
  evidenceEn: string;
  evidenceAr: string;
  confidence: 'High' | 'Medium' | 'Low';
  likelyCausesEn: string[];
  likelyCausesAr: string[];
  nextActionEn: string;
  nextActionAr: string;
};

export type DiagnosisOutput = {
  issues: DiagnosisIssue[];
};

export type NumericInput = {
  spend?: number;
  impressions?: number;
  linkClicks?: number;
  landingPageViews?: number;
  purchases?: number;
  uniqueOutboundClicks?: number;
  checkoutsInitiated?: number;
  threeSecViews?: number;
  thruPlays?: number;
  contentViews?: number;
  videoPlays?: number;
};

export type NormalizedRow = {
  campaignName?: string;
  adSetName?: string;
  adName?: string;
  productName?: string;
  inferredProduct?: string;
  inferredCode?: string;
  spend?: number;
  impressions?: number;
  linkClicks?: number;
  landingPageViews?: number;
  purchases?: number;
  costPerResult?: number;
  checkoutsInitiated?: number;
  threeSecViews?: number;
  thruPlays?: number;
  uniqueOutboundClicks?: number;
  contentViews?: number;
  ctr?: number;
  cpc?: number;
  cpm?: number;
  videoPlays?: number;
  landingPageUrl?: string;
};
