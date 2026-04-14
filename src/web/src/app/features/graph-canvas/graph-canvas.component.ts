import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import CareerApiService from '../../core/services/career-api.service';
import CareerNode from '../../core/models/career-node.model';
import CLUSTER_COLOURS from '../../core/constants/cluster-colours';

@Component({
  selector: 'app-graph-canvas',
  template: `<div id="graph-container" style="height:100%; width:100%;"></div>`,
})
export class GraphCanvasComponent implements OnInit, OnDestroy {
  private graph: any = null;
  private graphData = { nodes: [], links: [] };
  private _pathNodeIds = new Set<string>();
  private _selectedNodeId: string | null = null;

  @Input() set pathNodeIds(ids: string[]) {
    this._pathNodeIds = new Set(ids);
    this.graph?.refresh();
  }

  @Output() nodeSelected = new EventEmitter<CareerNode | null>();

  constructor(private careerApiService: CareerApiService) {}

  async ngOnInit(): Promise<void> {
    const ForceGraph3D = (await import('3d-force-graph')).default;
    this.graph = ForceGraph3D()(document.getElementById('graph-container'));

    this.graph.nodeColor((n: any) => {
      if (this._pathNodeIds.has(n.id)) return '#FFD700';
      if (n.id === this._selectedNodeId) return '#FFFFFF';
      return (CLUSTER_COLOURS as Record<string, string>)[n.group] || '#ADB5BD';
    })
      .nodeVal((n: any) => n.val)
      .linkDirectionalArrowLength(4)
      .linkDirectionalArrowRelPos(1);

    const results = await firstValueFrom(
      this.careerApiService.searchCareers('Elementary School Teachers', 1)
    );
    if (results.length > 0) {
      await this.loadNeighbourhood(results[0].id, 2);
    }

    this.graph.onNodeClick(async (node: any) => {
      if (node.id === this._selectedNodeId) {
        this._selectedNodeId = null;
        this.nodeSelected.emit(null);
      } else {
        this._selectedNodeId = node.id;
        await this.loadNeighbourhood(node.id, 2);
        try {
          const detail = await firstValueFrom(
            this.careerApiService.getCareerDetail(node.id)
          );
          this.nodeSelected.emit(detail);
        } catch (e) {}
      }
    });

    this.graph.onNodeHover((node: any) => {
      const c = document.getElementById('graph-container');
      if (!c) return;
      if (node) c.setAttribute('title', node.name);
      else c.removeAttribute('title');
    });
  }

  ngOnDestroy(): void {
    if (this.graph) this.graph.pauseAnimation();
  }

  private async loadNeighbourhood(nodeId: string, depth: number): Promise<void> {
    const data = await firstValueFrom(
      this.careerApiService.getNeighbourhood(nodeId, depth)
    );
    const newData = this.convertToGraphFormat(data);
    this.mergeGraphData(newData);
    this.graph.graphData(this.graphData);
  }

  private convertToGraphFormat(data: any): object {
    return {
      nodes: data.nodes.map((n: any) => ({
        id: n.id,
        name: n.title,
        val: this.normaliseSalary(n.medianSalaryUsd ?? 0),
        group: n.careerCluster,
      })),
      links: data.edges.map((e: any) => ({
        source: e.sourceNodeId,
        target: e.targetNodeId,
      })),
    };
  }

  private normaliseSalary(salary: number): number {
    const min = 50000;
    const max = 200000;
    return ((salary - min) / (max - min)) * 6 + 2;
  }

  private mergeGraphData(newData: any): void {
    this.graphData.nodes = [
      ...new Set(
        [...this.graphData.nodes, ...newData.nodes].map((n: any) =>
          JSON.stringify(n)
        )
      ),
    ].map((s: string) => JSON.parse(s));
    this.graphData.links = [
      ...new Set(
        [...this.graphData.links, ...newData.links].map((l: any) =>
          JSON.stringify(l)
        )
      ),
    ].map((s: string) => JSON.parse(s));
  }
}
