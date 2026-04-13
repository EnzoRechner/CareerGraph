export interface CareerNode {
  id: string;
  socCode: string;
  title: string;
  description?: string;
  careerCluster?: string;
  educationLevel?: string;
  medianSalaryUsd?: number;
  experienceYearsTypical?: number;
  brightOutlook: boolean;
  source: string;
}
