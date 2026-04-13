import { Component, OnInit, OnDestroy } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CareerApiService } from '../../core/services/career-api.service';

interface GraphData {
  nodes: any[];
  links: any[];
}

const CLUSTER_COLOURS = {
  'Management': '#E63946',
  'Business & Financial': '#F4A261',
  'Computer & Mathematical': '#2EC4B6',
  'Architecture & Engineering': '#457B9D',
  'Life, Physical & Social Science': '#8338EC',
  'Community & Social Service': '#FF6B6B',
  'Legal': '#6C757D',
  'Education, Training & Library': '#3A86FF',
  'Arts, Design, Entertainment & Media': '#FB5607',
  'Healthcare Practitioners': '#D62828',
  'Healthcare Support': '#EF476F',
  'Protective Services': '#118AB2',
  'Food Preparation & Serving': '#FFD166',
  'Building & Grounds Maintenance': '#06D6A0',
  'Personal Care & Service': '#F72585',
  'Sales': '#4CC9F0',
  'Office & Administrative Support': '#7209B7',
  'Farming, Fishing & Forestry': '#2D6A4F',
  'Construction & Extraction': '#E76F51',
  'Installation, Maintenance & Repair': '#264653',
  'Production': '#A8DADC',
  'Transportation & Material Moving': '#023E8A',
  'Military Specific': '#6B705C',
  'Other': '#ADB5BD'
};

@Component({
  selector: 'app-graph-canvas',
  template: `<div id="graph-container" style="height:100vh; width:100%;"></div>`,
  standalone: true,
})
export class GraphCanvasComponent implements OnInit, OnDestroy {
  private graph: any;
  private graphData: GraphData = { nodes: [], links: [] };

  constructor(private careerApiService: CareerApiService) {}

  async ngOnInit() {
    // Cast to any — 3d-force-graph TS types don't match its runtime factory pattern
    const ForceGraph3D = (await import('3d-force-graph')).default as any;

    this.graph = ForceGraph3D()(document.getElementById('graph-container'));
    this.graph.linkDirectionalArrowLength(4).linkDirectionalArrowRelPos(1);

    const nodes = await firstValueFrom(this.careerApiService.searchCareers('Elementary School Teachers', 1));
    if (nodes.length > 0) {
      const nodeId = nodes[0].id;
      this.loadNeighbourhood(nodeId, 2);
    }

    this.graph.onNodeClick((node: any) => {
      this.loadNeighbourhood(node.id, 2);
    });

    this.graph.onNodeHover((node: any) => {
      const container = document.getElementById('graph-container');
      if (!container) return;
      if (node) {
        container.setAttribute('title', `${node.title} - $${node.medianSalaryUsd} - ${node.careerCluster}`);
      } else {
        container.removeAttribute('title');
      }
    });
  }

  async loadNeighbourhood(nodeId: string, depth: number) {
    const neighbourhood = await firstValueFrom(this.careerApiService.getNeighbourhood(nodeId, depth));
    const newGraphData = this.convertToGraphFormat(neighbourhood);

    this.mergeGraphData(newGraphData);
    this.graph.graphData(this.graphData);
  }

  convertToGraphFormat(data: any): GraphData {
    return {
      nodes: data.nodes.map((node: any) => ({
        id: node.id,
        name: node.title,
        color: (CLUSTER_COLOURS as Record<string, string>)[node.careerCluster] || '#000',
        val: this.normaliseSalary(node.medianSalaryUsd ?? 0),
        group: node.careerCluster
      })),
      links: data.edges.map((edge: any) => ({
        source: edge.sourceNodeId,
        target: edge.targetNodeId
      }))
    };
  }

  normaliseSalary(salary: number): number {
    const min = 50000;
    const max = 200000;
    return ((salary - min) / (max - min)) * 6 + 2;
  }

  mergeGraphData(newGraphData: GraphData) {
    this.graphData.nodes = [...new Set([...this.graphData.nodes, ...newGraphData.nodes].map((n: any) => JSON.stringify(n)))].map((s: string) => JSON.parse(s));
    this.graphData.links = [...new Set([...this.graphData.links, ...newGraphData.links].map((l: any) => JSON.stringify(l)))].map((s: string) => JSON.parse(s));
  }

  ngOnDestroy() {
    if (this.graph) {
      this.graph.pauseAnimation();
    }
  }
}
