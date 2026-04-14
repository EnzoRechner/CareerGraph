import { Component } from '@angular/core';
import { GraphCanvasComponent } from './features/graph-canvas/graph-canvas.component';
import { CareerDetailSidebarComponent } from './features/sidebar/career-detail-sidebar.component';
import { PathFinderComponent } from './features/pathfinder/path-finder.component';
import { CareerNode } from './core/models/career-node.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [GraphCanvasComponent, CareerDetailSidebarComponent, PathFinderComponent],
  template: `
    <div class="shell">
      @if (selectedCareer) {
        <app-career-detail-sidebar [career]="selectedCareer" (closed)="selectedCareer = null">
        </app-career-detail-sidebar>
      }
      <div class="canvas-wrap">
        <app-path-finder (pathFound)="pathNodeIds = $event"></app-path-finder>
        <app-graph-canvas [pathNodeIds]="pathNodeIds" (nodeSelected)="selectedCareer = $event">
        </app-graph-canvas>
      </div>
    </div>
  `,
  styles: [`:host{display:block;height:100vh;margin:0;padding:0;background:#0a0a0a;overflow:hidden}
    .shell{display:flex;height:100vh;width:100%}
    .canvas-wrap{flex:1;height:100%;position:relative;overflow:hidden}`]
})
export class AppComponent {
  selectedCareer: CareerNode | null = null;
  pathNodeIds: string[] = [];
}
