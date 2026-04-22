export type DataMode = 'demo' | 'uploaded';

export type AdMetrics = {
  spend: number;
  purchases: number;
  linkClicks: number;
  landingPageViews: number;
  costPerResult: number;
};

export type CsvMapping = {
  campaignName?: string;
  productName?: string;
  creativeName?: string;
  spend?: string;
  purchases?: string;
  linkClicks?: string;
  landingPageViews?: string;
  costPerResult?: string;
};

export type FunnelMetrics = {
  purchasePerLinkClick?: number;
  purchasePerLandingPageView?: number;
  landingPageViewRate?: number;
  costPerResult?: number;
};

export type MissingMetric = {
  key: keyof FunnelMetrics;
  label: string;
  missingFields: string[];
};

export type DiagnosisOutput = {
  mainProblem: string;
  secondaryProblem: string;
  confidence: number;
  reasoning: string[];
  fixes: string[];
};

export type FinalDecision = {
  decision: 'scale' | 'hold' | 'kill';
  mainBottleneck: string;
  nextActions: string[];
};

export type GroupedCampaignData = {
  product: string;
  campaign: string;
  creative: string;
  rows: Record<string, string>[];
};
