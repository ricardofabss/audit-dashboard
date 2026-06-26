// ─── Sector & Business Unit ──────────────────────────────────────────

export type SectorType = "PERGADAIAN" | "MULTIFINANCE" | "OTOMOTIF";

export type BusinessUnit = {
  id: string;
  code: string;
  name: string;
  sector: SectorType;
  brand: string;
  color: string;       // primary UI accent color
  shortName: string;    // 3-4 letter abbreviation
};

// ─── Enums ───────────────────────────────────────────────────────────

export type AnomalyRuleCode =
  // Pergadaian A01-A08
  | "A01" | "A02" | "A03" | "A04" | "A05" | "A06" | "A07" | "A08"
  // Multifinance M01-M09
  | "M01" | "M02" | "M03" | "M04" | "M05" | "M06" | "M07" | "M08" | "M09"
  // Otomotif O01-O09
  | "O01" | "O02" | "O03" | "O04" | "O05" | "O06" | "O07" | "O08" | "O09";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type RiskEntityType = "CUSTOMER" | "BRANCH" | "OFFICER";

export type AnomalyStatus =
  | "DETECTED" | "CONFIRMED" | "INVESTIGATING" | "DISMISSED" | "RESOLVED";

export type AnomalyRuleCategory =
  | "FREQUENCY" | "AMOUNT" | "PATTERN" | "TIMING" | "CONCENTRATION"
  | "COLLATERAL" | "CREDIT" | "COMPLIANCE" | "INVENTORY" | "PRICING" | "META";

// ─── Anomaly Rule (Configuration) ────────────────────────────────────

export type AnomalyRuleThreshold = {
  /** e.g. maxTransactions, maxDays, minAmount, maxLtv */
  [key: string]: number | string | boolean;
};

export type AnomalyRule = {
  id: string;
  code: AnomalyRuleCode;
  sector: SectorType;
  name: string;
  nameId: string; // Indonesian name
  description: string;
  descriptionId: string; // Indonesian description
  riskWeight: number;
  thresholds: AnomalyRuleThreshold;
  isActive: boolean;
  category: AnomalyRuleCategory;
  createdAt: string;
};

// ─── Anomaly Detection (Instance) ────────────────────────────────────

export type AnomalyDetection = {
  id: string;
  ruleCode: AnomalyRuleCode;
  ruleName: string;
  sector: SectorType;
  businessUnitId: string;
  entityType: RiskEntityType;
  entityId: string;
  entityName: string;
  outletCode: string;
  outletName: string;
  branchName: string;
  riskScore: number;
  riskWeight: number;
  status: AnomalyStatus;
  detectedAt: string;
  resolvedAt?: string;
  metadata: Record<string, unknown>;
  description: string;
};

// ─── Risk Score Breakdown ────────────────────────────────────────────

export type RiskScoreBreakdownItem = {
  ruleCode: AnomalyRuleCode;
  ruleName: string;
  occurrences: number;
  weightedScore: number;
  lastDetected: string;
};

export type RiskScoreBreakdown = {
  items: RiskScoreBreakdownItem[];
  totalRawScore: number;
  normalizedScore: number;
  velocityFactor: number;
  decayApplied: boolean;
};

// ─── Customer Risk ───────────────────────────────────────────────────

export type CustomerRiskProfile = {
  id: string;
  sector: SectorType;
  businessUnitId: string;
  customerId: string;
  customerName: string;
  cifNumber: string;
  primaryOutlet: string;
  primaryBranch: string;
  totalScore: number;
  riskLevel: RiskLevel;
  anomalyCount: number;
  activeAnomalies: number;
  breakdown: RiskScoreBreakdown;
  transactionCount: number;
  totalLoanAmount: number;
  firstTransactionDate: string;
  lastTransactionDate: string;
  trend: number; // +/- change from last period
  trendDirection: "UP" | "DOWN" | "STABLE";
  updatedAt: string;
};

// ─── Branch Risk ─────────────────────────────────────────────────────

export type BranchRiskProfile = {
  id: string;
  sector: SectorType;
  businessUnitId: string;
  outletCode: string;
  outletName: string;
  branchName: string;
  regionName: string;
  areaName: string;
  totalScore: number;
  riskLevel: RiskLevel;
  anomalyCount: number;
  activeAnomalies: number;
  customerCount: number;
  highRiskCustomerCount: number;
  breakdown: RiskScoreBreakdown;
  transactionVolume: number;
  totalPortfolioValue: number;
  anomalyDensity: number; // anomalies per 100 transactions
  trend: number;
  trendDirection: "UP" | "DOWN" | "STABLE";
  updatedAt: string;
  avgPawnDuration?: number;
};

// ─── Officer Risk ────────────────────────────────────────────────────

export type OfficerRiskProfile = {
  id: string;
  sector: SectorType;
  businessUnitId: string;
  officerId: string;
  officerName: string;
  position: string;
  outletCode: string;
  outletName: string;
  branchName: string;
  totalScore: number;
  riskLevel: RiskLevel;
  anomalyCount: number;
  activeAnomalies: number;
  breakdown: RiskScoreBreakdown;
  handledTransactions: number;
  supervisoryGapScore: number;
  trend: number;
  trendDirection: "UP" | "DOWN" | "STABLE";
  updatedAt: string;
};

// ─── Risk Score History ──────────────────────────────────────────────

export type RiskScoreSnapshot = {
  id: string;
  sector: SectorType;
  businessUnitId: string;
  entityType: RiskEntityType;
  entityId: string;
  entityName: string;
  score: number;
  riskLevel: RiskLevel;
  anomalyCount: number;
  snapshotDate: string;
  periodLabel: string; // e.g. "Jan 2026", "W12 2026"
};

// ─── AI Risk Insight ─────────────────────────────────────────────────

export type RiskInsight = {
  id: string;
  sector: SectorType;
  businessUnitId: string;
  entityType: RiskEntityType | "SYSTEM";
  entityId?: string;
  entityName?: string;
  insightText: string;
  insightTextId: string; // Indonesian
  severity: RiskLevel;
  category: "TREND" | "CLUSTER" | "SUMMARY" | "RECOMMENDATION" | "ALERT";
  confidence: number; // 0-100
  generatedAt: string;
  isRead: boolean;
  actionTaken: boolean;
};

// ─── Executive Dashboard Metrics ─────────────────────────────────────

export type ExecutiveRiskMetrics = {
  totalActiveAnomalies: number;
  anomalyChangePercent: number;
  criticalRiskCustomers: number;
  customerChangePercent: number;
  averageBranchRiskScore: number;
  branchScoreChangePercent: number;
  riskCoveragePercent: number;
  coverageChangePercent: number;
  anomalyByRule: { ruleCode: AnomalyRuleCode; ruleName: string; count: number }[];
  anomalyByStatus: { status: AnomalyStatus; count: number }[];
  riskDistribution: { level: RiskLevel; count: number }[];
};

// ─── Chart Data Types ────────────────────────────────────────────────

export type RiskTrendDataPoint = {
  period: string;
  customerAvg: number;
  branchAvg: number;
  officerAvg: number;
  anomalyCount: number;
  durationStdDev?: number;
};

export type AnomalyTrendDataPoint = {
  period: string;
  [ruleCode: string]: string | number; // dynamic rule code keys
  total: number;
};

export type BranchRiskHeatmapCell = {
  outletCode: string;
  outletName: string;
  branchName: string;
  score: number;
  riskLevel: RiskLevel;
  anomalyCount: number;
};

export type RiskRadarDataPoint = {
  rule: string;
  score: number;
  fullMark: number;
};

// ─── Multi-BU Data Container ─────────────────────────────────────────

export type RiskMockDataSet = {
  anomalyRules: AnomalyRule[];
  anomalyDetections: AnomalyDetection[];
  customerRiskProfiles: CustomerRiskProfile[];
  branchRiskProfiles: BranchRiskProfile[];
  officerRiskProfiles: OfficerRiskProfile[];
  riskScoreHistory: RiskScoreSnapshot[];
  riskInsights: RiskInsight[];
  riskTrends: RiskTrendDataPoint[];
  anomalyTrends: AnomalyTrendDataPoint[];
};
