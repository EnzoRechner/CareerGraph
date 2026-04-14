import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CareerNode } from '../../core/models/career-node.model';
import { CLUSTER_COLOURS } from '../../core/constants/cluster-colours';

@Component({
  selector: 'app-career-detail-sidebar',
  template: `
    <div style="width:300px;height:100vh;background:#111;color:#fff;padding:20px;box-sizing:border-box;overflow-y:auto;position:relative;">
      @if (career) {
        <button
          (click)="closed.emit()"
          style="position:absolute;top:12px;right:12px;background:none;border:none;color:#aaa;font-size:18px;cursor:pointer;"
        >
          X
        </button>
        <span
          [style.background]="clusterColor"
          style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600;margin-bottom:12px;color:#fff;"
        >
          {{ career.careerCluster }}
        </span>
        <h2 style="margin:0 0 16px;font-size:16px;">{{ career.title }}</h2>
        <div>Median Salary: {{ formatSalary() }}</div>
        <div>Experience: {{ career.experienceYearsTypical }} years or Not specified</div>
        @if (career.brightOutlook) {
          <div style="color:#FFD700;">Bright Outlook</div>
        }
        @if (career.description) {
          <p
            style="font-size:13px;color:#ccc;line-height:1.6;margin-top:16px;"
          >
            {{ career.description }}
          </p>
        }
      }
    </div>
  `,
  styles: []
})
export class CareerDetailSidebarComponent {
  @Input() career: CareerNode | null = null;
  @Output() closed = new EventEmitter<void>();

  get clusterColor(): string {
    return CLUSTER_COLOURS[this.career?.careerCluster || ''] || '#555';
  }

  formatSalary(): string {
    return this.career?.medianSalaryUsd
      ? `$${this.career.medianSalaryUsd.toLocaleString()}`
      : 'Not available';
  }
}