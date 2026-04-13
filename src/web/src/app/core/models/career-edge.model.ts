export interface CareerEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationshipType: string;
  weight: number;
  yearsExperienceDelta?: number;
  salaryDeltaUsd?: number;
}
