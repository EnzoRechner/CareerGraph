import { Component, EventEmitter, Output } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CareerApiService } from '../../core/services/career-api.service';
import { CareerNode } from '../../core/models/career-node.model';

@Component({
  selector: 'app-path-finder',
  template: `
    <div style="position:absolute;top:16px;right:16px;background:#1a1a1a;border-radius:8px;padding:16px;color:#fff;min-width:240px;z-index:100;">
      <h3 style="margin:0 0 12px;">Path Finder</h3>
      <section>
        <label><div style="font-size:11px;color:#888;margin-bottom:4px;">FROM</div></label>
        <input [value]="fromQuery" (input)="onFromInput($event.target.value)" width="100%" box-sizing="border-box" padding="6px" background="#333" border="1px solid #555" border-radius="4px" color="#fff" margin-bottom="4px"/>
        @if (fromResults.length > 0) {
          <div style="background:#2a2a2a;border:1px solid #444;border-radius:4px;max-height:120px;overflow-y:auto;">
            @for (result of fromResults; track result.id) {
              <a (click)="selectFrom(result)" style="padding:6px 10px;cursor:pointer;font-size:13px;">{{ result.title }}</a>
            }
          </div>
        }
      </section>
      <section>
        <label><div style="font-size:11px;color:#888;margin-bottom:4px;">TO</div></label>
        <input [value]="toQuery" (input)="onToInput($event.target.value)" width="100%" box-sizing="border-box" padding="6px" background="#333" border="1px solid #555" border-radius="4px" color="#fff" margin-bottom="4px"/>
        @if (toResults.length > 0) {
          <div style="background:#2a2a2a;border:1px solid #444;border-radius:4px;max-height:120px;overflow-y:auto;">
            @for (result of toResults; track result.id) {
              <a (click)="selectTo(result)" style="padding:6px 10px;cursor:pointer;font-size:13px;">{{ result.title }}</a>
            }
          </div>
        }
      </section>
      <button [disabled]="loading || !fromId || !toId" (click)="findPath()" style="margin-top:12px;width:100%;padding:8px;background:#2EC4B6;color:#000;border:none;border-radius:4px;font-weight:600;cursor:pointer;">Find Path</button>
      @if (error) {
        <div style="color:#ef476f;font-size:12px;margin-top:8px;">{{ error }}</div>
      }
      @if (loading) {
        <div style="color:#aaa;font-size:12px;margin-top:4px;">Searching...</div>
      }
    </div>
  `
})
export class PathFinderComponent {
  @Output() pathFound = new EventEmitter<string[]>();

  fromQuery = '';
  toQuery = '';
  fromResults: CareerNode[] = [];
  toResults: CareerNode[] = [];
  fromId: string | null = null;
  toId: string | null = null;
  loading = false;
  error = '';

  constructor(private careerApiService: CareerApiService) {}

  async onFromInput(value: string) {
    this.fromQuery = value;
    if (value.length >= 2) {
      try {
        this.fromResults = await firstValueFrom(this.careerApiService.searchCareers(value, 5));
      } catch (e) {
        this.fromResults = [];
      }
    } else {
      this.fromResults = [];
    }
  }

  async onToInput(value: string) {
    this.toQuery = value;
    if (value.length >= 2) {
      try {
        this.toResults = await firstValueFrom(this.careerApiService.searchCareers(value, 5));
      } catch (e) {
        this.toResults = [];
      }
    } else {
      this.toResults = [];
    }
  }

  selectFrom(career: CareerNode) {
    this.fromId = career.id;
    this.fromQuery = career.title;
    this.fromResults = [];
  }

  selectTo(career: CareerNode) {
    this.toId = career.id;
    this.toQuery = career.title;
    this.toResults = [];
  }

  async findPath() {
    if (!this.fromId || !this.toId) {
      this.error = 'Select both careers first';
      return;
    }
    this.loading = true;
    this.error = '';
    try {
      const result = await firstValueFrom(this.careerApiService.findPath(this.fromId, this.toId));
      this.pathFound.emit(result.nodeIds);
    } catch (e) {
      this.error = 'Path not found';
    } finally {
      this.loading = false;
    }
  }
}