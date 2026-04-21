/**
 * Risk Scoring Configuration and Weights
 * Provides structure for future custom scoring and ML-assisted risk scoring.
 */

export const SENSITIVITY_WEIGHTS = {
  'Public': 1,
  'Internal': 2,
  'Confidential': 4,
  'Critical': 5,
};

export const EXPOSURE_WEIGHTS = {
  'Internal only': 1,
  'Cross-module': 2,
  'External API': 4,
  'Public endpoint': 5,
};

export const ACCESS_WEIGHTS = {
  'Authenticated admin': 1,
  'Internal employee': 2,
  'Multiple roles': 3,
  'Anonymous user': 5,
};

/**
 * Calculates score based on the number of affected modules.
 */
export const getAffectedModulesScore = (numberOfModules: number): number => {
  if (numberOfModules === 1) return 1;
  if (numberOfModules >= 2 && numberOfModules <= 3) return 2;
  if (numberOfModules >= 4 && numberOfModules <= 5) return 3;
  if (numberOfModules >= 6) return 5;
  return 1; // Default
};

/**
 * Parses the raw input data and extracts the necessary severity score inputs.
 */
export const calculateRiskScore = (risk: any): number => {
  const sensitivityScore = SENSITIVITY_WEIGHTS[risk.sensitivityLevel as keyof typeof SENSITIVITY_WEIGHTS] || 1;
  const exposureScore = EXPOSURE_WEIGHTS[risk.exposureType as keyof typeof EXPOSURE_WEIGHTS] || 1;
  const accessScore = ACCESS_WEIGHTS[risk.roleAccess as keyof typeof ACCESS_WEIGHTS] || 1;
  const modulesScore = getAffectedModulesScore(risk.affectedModulesCount || 1);

  return sensitivityScore + exposureScore + accessScore + modulesScore;
};

/**
 * Classifies severity based on the calculated risk score.
 */
export const classifySeverity = (score: number): 'High' | 'Medium' | 'Low' => {
  if (score >= 14) return 'High';
  if (score >= 8 && score <= 13) return 'Medium';
  return 'Low'; // 4 to 7
};

/**
 * Generates a readable risk summary based on the provided risk parameters.
 * Example target: “Sensitive customer data flows through a public API endpoint affecting 4 modules. Classified as High severity due to critical exposure.”
 */
export const generateRiskSummary = (risk: any, severity: string): string => {
  const dataDesc = risk.sensitivityLevel === 'Critical' || risk.sensitivityLevel === 'Confidential' 
    ? 'Sensitive data' 
    : 'Data';

  const exposureDesc = risk.exposureType ? risk.exposureType.toLowerCase() : 'internal framework';
  const moduleCount = risk.affectedModulesCount || 1;
  
  let severityReason = 'standard exposure';
  if (severity === 'High') {
    severityReason = 'critical exposure and high sensitivity';
  } else if (severity === 'Medium') {
    severityReason = 'elevated potential risk factors';
  }

  return `${dataDesc} flows through a ${exposureDesc} affecting ${moduleCount} module${moduleCount !== 1 ? 's' : ''}. ` + 
         `Classified as ${severity} severity due to ${severityReason}.`;
};

/**
 * Enhances a given raw risk from Rule Engine with score, severity, summary, and parses modules.
 */
export const processRisk = (rawRisk: any) => {
  // If rule provides an array of modules or a number, we use it. Often rule engines return a string of affected component or source/dest
  let affectedModulesCount = 1;
  if (rawRisk.sourceModule && rawRisk.destinationModule) {
      affectedModulesCount = 2; // basic deduction if only source/dest provided
  }
  // Try to parse number from risk if explicitly provided, else fallback to 2 (source+dest)
  if (rawRisk.affectedModulesCount) {
      affectedModulesCount = rawRisk.affectedModulesCount;
  }

  const enhancedRisk = {
      ...rawRisk,
      affectedModulesCount,
      timestamp: rawRisk.timestamp || new Date().toISOString(),
  };

  const score = calculateRiskScore(enhancedRisk);
  const severity = classifySeverity(score);
  const summary = generateRiskSummary(enhancedRisk, severity);

  return {
      ...enhancedRisk,
      score,
      severity,
      summary
  };
};

/**
 * Priorities Mapping to weights for Sorting
 */
const SEVERITY_SORT_WEIGHT = {
  'High': 3,
  'Medium': 2,
  'Low': 1
};

/**
 * Sorts grouped risks by:
 * 1. Severity (High first)
 * 2. Score descending
 * 3. Timestamp latest first
 */
export const sortRisks = (risks: any[]) => {
  return risks.sort((a, b) => {
      // 1. Severity
      const sevA = SEVERITY_SORT_WEIGHT[a.severity as keyof typeof SEVERITY_SORT_WEIGHT] || 0;
      const sevB = SEVERITY_SORT_WEIGHT[b.severity as keyof typeof SEVERITY_SORT_WEIGHT] || 0;
      if (sevA !== sevB) {
          return sevB - sevA; 
      }
      
      // 2. Score descending
      if (a.score !== b.score) {
          return b.score - a.score;
      }

      // 3. Timestamp latest first
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeB - timeA;
  });
};
