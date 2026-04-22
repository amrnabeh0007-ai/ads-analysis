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
  | 'creativeName'
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
  | 'operationsCost';

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

export type DiagnosisOutput = {
  mainDiagnosisEn: string;
  mainDiagnosisAr: string;
  secondaryDiagnosisEn: string;
  secondaryDiagnosisAr: string;
  confidence: 'High' | 'Medium' | 'Low';
  nextActionsEn: string[];
  nextActionsAr: string[];
};

export type GroupedCampaignData = {
  product: string;
  productCode?: string;
  campaign: string;
  adSet?: string;
  creative?: string;
  rows: Record<string, string>[];
};
