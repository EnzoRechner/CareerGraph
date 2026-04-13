import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CareerNode } from '../models/career-node.model';
import { CareerEdge } from '../models/career-edge.model';
import { GraphData } from '../models/graph-data.model';

@Injectable({
  providedIn: 'root'
})
export class CareerApiService {
  private BASE_URL = '/api/v1/careers';

  constructor(private http: HttpClient) {}

  getNeighbourhood(id: string, depth?: number): Observable<GraphData> {
    let params = new HttpParams();
    if (depth !== undefined) {
      params = params.set('depth', depth.toString());
    }
    return this.http.get<GraphData>(`${this.BASE_URL}/${id}/neighbourhood`, { params });
  }

  searchCareers(q: string, limit?: number): Observable<CareerNode[]> {
    let params = new HttpParams().set('q', q);
    if (limit !== undefined) {
      params = params.set('limit', limit.toString());
    }
    return this.http.get<CareerNode[]>(`${this.BASE_URL}/search`, { params });
  }

  findPath(fromId: string, toId: string): Observable<{ nodeIds: string[] }> {
    const params = new HttpParams().set('fromId', fromId).set('toId', toId);
    return this.http.get<{ nodeIds: string[] }>(`${this.BASE_URL}/path`, { params });
  }
}
