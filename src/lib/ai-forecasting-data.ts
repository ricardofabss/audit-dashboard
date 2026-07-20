export type ForecastDataPoint = {
  month: string;
  historical: number | null;
  predicted: number | null;
  upperBound: number | null;
  lowerBound: number | null;
  isForecast: boolean;
};

// Base data for Audit Coverage Forecast
export const baseCoverageForecast: ForecastDataPoint[] = [
  { month: "Jan 26", historical: 75, predicted: null, lowerBound: null, upperBound: null, isForecast: false },
  { month: "Feb 26", historical: 68, predicted: null, lowerBound: null, upperBound: null, isForecast: false },
  { month: "Mar 26", historical: 74, predicted: null, lowerBound: null, upperBound: null, isForecast: false },
  { month: "Apr 26", historical: 80, predicted: null, lowerBound: null, upperBound: null, isForecast: false },
  { month: "May 26", historical: 87, predicted: 87, lowerBound: 87, upperBound: 87, isForecast: false }, // Connection point
  { month: "Jun 26", historical: null, predicted: 92, lowerBound: 85, upperBound: 98, isForecast: true },
  { month: "Jul 26", historical: null, predicted: 95, lowerBound: 82, upperBound: 105, isForecast: true },
  { month: "Aug 26", historical: null, predicted: 88, lowerBound: 70, upperBound: 110, isForecast: true },
  { month: "Sep 26", historical: null, predicted: 85, lowerBound: 65, upperBound: 115, isForecast: true },
  { month: "Oct 26", historical: null, predicted: 75, lowerBound: 50, upperBound: 120, isForecast: true },
  { month: "Nov 26", historical: null, predicted: 60, lowerBound: 40, upperBound: 130, isForecast: true },
];

export const generateWhatIfData = (auditorAdjustment: number, techAdoption: number) => {
  return baseCoverageForecast.map((point, index) => {
    if (!point.isForecast) return point;
    
    // Holding level heuristic: Deploying central auditors boosts consolidated coverage across all subsidiaries.
    const multiplier = index - 4; // Months into the future
    
    // Tech adoption (0-100%) acts as a multiplier for auditor efficiency.
    const efficiencyMultiplier = 1 + (techAdoption / 100);
    const boost = auditorAdjustment * 1.5 * multiplier * efficiencyMultiplier;
    
    // Tech also independently increases baseline coverage through automation
    const techBoost = (techAdoption / 10) * multiplier;

    return {
      ...point,
      predicted: Math.max(0, Math.min(250, (point.predicted || 0) + boost + techBoost)),
      upperBound: Math.max(0, Math.min(250, (point.upperBound || 0) + (boost * 1.2) + techBoost)),
      lowerBound: Math.max(0, Math.min(250, (point.lowerBound || 0) + (boost * 0.8) + techBoost)),
    };
  });
};

// --- Holding Anomaly Intelligence Forecasting ---

export type RiskForecastDataPoint = {
  month: string;
  historicalCritical: number | null;
  predictedCritical: number | null;
  isForecast: boolean;
};

export const baseRiskForecast: RiskForecastDataPoint[] = [
  { month: "Jan 26", historicalCritical: 45, predictedCritical: null, isForecast: false },
  { month: "Feb 26", historicalCritical: 48, predictedCritical: null, isForecast: false },
  { month: "Mar 26", historicalCritical: 55, predictedCritical: null, isForecast: false },
  { month: "Apr 26", historicalCritical: 50, predictedCritical: null, isForecast: false },
  { month: "May 26", historicalCritical: 60, predictedCritical: 60, isForecast: false }, // Connection
  { month: "Jun 26", historicalCritical: null, predictedCritical: 65, isForecast: true },
  { month: "Jul 26", historicalCritical: null, predictedCritical: 72, isForecast: true },
  { month: "Aug 26", historicalCritical: null, predictedCritical: 85, isForecast: true },
  { month: "Sep 26", historicalCritical: null, predictedCritical: 95, isForecast: true },
  { month: "Oct 26", historicalCritical: null, predictedCritical: 110, isForecast: true },
  { month: "Nov 26", historicalCritical: null, predictedCritical: 130, isForecast: true },
];

export const generateRiskWhatIfData = (stressFactor: number, mitigationBudget: number) => {
  return baseRiskForecast.map((point, index) => {
    if (!point.isForecast) return point;
    
    // Stress factor (0 to 100) affects the slope of critical risks.
    // Mitigation Budget (0-100) reduces the growth of risks.
    const multiplier = index - 4; 
    const baseGrowth = (point.predictedCritical || 60) - 60;
    
    const stressMultiplier = 1 + (stressFactor / 50); // e.g. stress=50 doubles the growth
    const mitigationReducer = 1 - (mitigationBudget / 200); // 100% budget halves the risk growth
    
    const netGrowth = baseGrowth * stressMultiplier * mitigationReducer;

    return {
      ...point,
      predictedCritical: Math.max(0, Math.floor(60 + netGrowth)),
    };
  });
};

export const riskPrescriptiveInsights = [
  {
    condition: (stress: number, budget: number) => stress < 30 && budget >= 30,
    title: "Well-Managed Risk Profile",
    description: "Holding consolidated risk exposure remains stable. Current mitigation budget is effectively suppressing stress events.",
    action: "Maintain current distributed audit schedules. Focus on routine compliance in low-risk sectors.",
    type: "success"
  },
  {
    condition: (stress: number, budget: number) => stress >= 60 && budget > 70,
    title: "High Stress, High Mitigation",
    description: "Severe macroeconomic stress is present, but aggressive budget deployment is containing a systemic blowout.",
    action: "Monitor liquidity reserves carefully. Ensure mitigation funds are reaching the highest-risk subsidiaries.",
    type: "info"
  },
  {
    condition: (stress: number, budget: number) => stress >= 50 && budget < 40,
    title: "Elevated Systemic Risk Contagion",
    description: "Moderate to high economic stress is predicted to cause a spike in CRITICAL findings, while mitigation budget is insufficient.",
    action: "Trigger Holding Level 2 Alert. Reallocate central audit reserves to conduct surprise audits on Top 20% high-risk branches.",
    type: "warning"
  },
  {
    condition: (stress: number, budget: number) => stress >= 80 && budget < 30,
    title: "Severe Holding-Wide Exposure",
    description: "Extreme macroeconomic stress combined with low mitigation funding will trigger a 200%+ explosion in systemic defaults.",
    action: "CRITICAL: Halt all non-essential audits. Deploy 'Tiger Teams' strictly for fraud investigation and liquidity stress testing across all subsidiaries immediately.",
    type: "danger"
  },
  {
    condition: () => true, // Fallback
    title: "Moderate Risk Outlook",
    description: "Risk levels are tracking normally. No severe anomalies detected at the current stress and mitigation parameters.",
    action: "Continue standard operational cadence. Re-evaluate if macro indicators shift.",
    type: "info"
  }
];

// --- Holding Coverage Insights ---

export const prescriptiveInsights = [
  {
    condition: (auditorAdjust: number, techAdoption: number) => auditorAdjust < 0 && techAdoption < 40,
    title: "Critical Coverage Drop Risk",
    description: "Reducing central auditor headcount without sufficient AI/Tech adoption will trigger a severe drop in Consolidated Audit Coverage.",
    action: "Halt headcount reduction OR immediately accelerate AI automation rollout to offset the labor shortage.",
    type: "danger"
  },
  {
    condition: (auditorAdjust: number, techAdoption: number) => auditorAdjust < 0 && techAdoption >= 70,
    title: "Successful Automation Transition",
    description: "Headcount reductions are being successfully offset by high AI/Tech adoption. Coverage remains stable.",
    action: "Continue scaling AI models. Ensure data quality in automated audit pipelines remains high.",
    type: "success"
  },
  {
    condition: (auditorAdjust: number, techAdoption: number) => auditorAdjust >= 0 && auditorAdjust <= 5 && techAdoption < 50,
    title: "Leaky Bucket Syndrome Detected",
    description: "With minimal new hires and low tech adoption, consolidated coverage will naturally decline in Q4 due to historical churn.",
    action: "Deploy 5 additional central auditors immediately as 'Flying Squads' to Cash Cow subsidiaries to stabilize the Q4 decline.",
    type: "warning"
  },
  {
    condition: (auditorAdjust: number, techAdoption: number) => auditorAdjust > 10 && techAdoption > 60,
    title: "Optimal Growth & Tech Synergy",
    description: "High tech adoption combined with aggressive hiring is creating a highly scalable and robust audit coverage model.",
    action: "Focus human auditors strictly on complex judgment-based audits, leaving routine checks to the AI systems.",
    type: "success"
  },
  {
    condition: (auditorAdjust: number, techAdoption: number) => auditorAdjust > 15 && techAdoption <= 30,
    title: "Diminishing Returns on Labor",
    description: "Aggressive central hiring without tech scale will boost coverage, but the cost per audit will skyrocket, hurting Net Profit Margin.",
    action: "Cap central auditor hiring. Invest the surplus holding budget into AI-driven Anomaly Detection software instead of manual labor.",
    type: "info"
  },
  {
    condition: () => true, // Fallback
    title: "Stable Coverage Trajectory",
    description: "Audit coverage is projected to remain steady based on current parameter selections.",
    action: "Maintain current balance of resources and technology.",
    type: "info"
  }
];
