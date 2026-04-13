import { Component } from '@angular/core';
import { GraphCanvasComponent } from './features/graph-canvas/graph-canvas.component';

@Component({
  selector: 'app-root',
  imports: [GraphCanvasComponent],
  template: '<app-graph-canvas></app-graph-canvas>',
  styles: [`
    :host { display: block; height: 100vh; margin: 0; padding: 0; background: #0a0a0a; }
  `]
})
export class AppComponent {}
