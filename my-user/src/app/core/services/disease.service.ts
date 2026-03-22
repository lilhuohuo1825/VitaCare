import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface DiseaseFilters {
  bodyPart?: string;
  groupSlug?: string;
  page?: number;
  limit?: number;
}

export interface DiseaseGroup {
  slug: string;
  name: string;
  icon?: string;
  count?: number;
}

@Injectable({
  providedIn: 'root',
})
export class DiseaseService {
  private apiUrl = '/api';

  constructor(private http: HttpClient) { }

  /** Lấy danh sách nhóm bệnh từ MongoDB (API). */
  getDiseaseGroups(): Observable<DiseaseGroup[]> {
    return this.http.get<DiseaseGroup[]>(`${this.apiUrl}/disease-groups`).pipe(
      map((res: any) => (Array.isArray(res) ? res : res?.groups ?? [])),
      catchError(() => of([]))
    );
  }

  /** Lấy danh sách bệnh từ MongoDB (API). */
  getDiseases(filters: DiseaseFilters): Observable<{
    diseases: any[];
    total: number;
    totalPages: number;
  }> {
    let params = new HttpParams();
    if (filters.bodyPart) params = params.set('bodyPart', filters.bodyPart);
    if (filters.groupSlug) params = params.set('groupSlug', filters.groupSlug);
    if (filters.page) params = params.set('page', String(filters.page));
    if (filters.limit) params = params.set('limit', String(filters.limit));

    return this.http.get<any>(`${this.apiUrl}/diseases`, { params }).pipe(
      map((res) => ({
        diseases: res?.diseases ?? [],
        total: res?.total ?? 0,
        totalPages: res?.totalPages ?? 1,
      })),
      catchError(() => of({ diseases: [], total: 0, totalPages: 1 }))
    );
  }

  getDiseaseById(id: string): Observable<any> {
    const encodedId = encodeURIComponent(id);
    return this.http.get<any>(`${this.apiUrl}/diseases/${encodedId}`).pipe(
      catchError(() => of({ message: 'Not found' }))
    );
  }

  /** Lấy danh sách câu hỏi về bệnh. */
  getConsultations(id: string): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/consultations/disease/${encodeURIComponent(id)}`).pipe(
      map(res => res?.questions ?? []),
      catchError(() => of([]))
    );
  }

  /** Gửi câu hỏi mới về bệnh. */
  postConsultation(data: { sku: string, productName: string, question: string, user_id?: string, full_name?: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/consultations/disease`, data).pipe(
      catchError((err) => {
        console.error('Post consultation error:', err);
        throw err;
      })
    );
  }

  /** Toggle "Hữu ích" trên câu hỏi về bệnh. */
  likeDiseaseConsultation(data: { sku: string; questionId: string; userId: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/consultations/disease/like`, data).pipe(
      catchError((err) => {
        console.error('Like disease consultation error:', err);
        throw err;
      })
    );
  }

  /** Trả lời câu hỏi về bệnh. */
  replyDiseaseConsultation(data: {
    sku: string;
    questionId: string;
    content: string;
    fullname?: string;
    user_id?: string | null;
    avatar?: string;
    isAdmin?: boolean;
  }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/consultations/disease/reply`, data).pipe(
      catchError((err) => {
        console.error('Reply disease consultation error:', err);
        throw err;
      })
    );
  }
}
