import { CareerNode } from './career-node.model';
import { CareerEdge } from './career-edge.model';

export interface GraphData {
  focusNodeId: string;
  nodes: CareerNode[];
  edges: CareerEdge[];
}
