import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class BlogService {
  /** Dùng /api để proxy qua ng serve (proxy.conf.json → localhost:3000) */
  private apiUrl = '/api';
  private readonly apiBase = '';

  /** Cache đơn giản để tránh gọi lại API nhiều lần cho cùng một bộ filters trong thời gian ngắn. */
  private readonly cache = new Map<string, { timestamp: number; data: any }>();
  private readonly cacheTTLms = 60_000; // 60s, có thể chỉnh nếu cần

  /** Cache chi tiết bài viết theo slug - hiển thị nhanh khi quay lại */
  private readonly cacheBySlug = new Map<string, { timestamp: number; data: any }>();
  private readonly cacheBySlugTTLms = 120_000; // 2 phút

  /** Chuẩn hoá URL ảnh từ backend (blog). */
  private normalizeImageUrl(src?: string | null): string | undefined {
    if (!src) return undefined;
    if (typeof src !== 'string') return src as any;
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('assets/')) {
      return src;
    }
    if (src.startsWith('/')) return src;
    return `/${src}`;
  }

  constructor(private http: HttpClient) { }

  /** Lấy blog theo chỉ số sức khỏe (BMI, bloodPressure, ...). Trừ medication. */
  getBlogsByIndicator(healthIndicator: string, limit = 6): Observable<any> {
    return this.getBlogs({ healthIndicator, limit, page: 1 });
  }

  getBlogs(filters: any = {}): Observable<any> {
    const key = JSON.stringify(filters || {});
    const now = Date.now();
    const cached = this.cache.get(key);

    if (cached && now - cached.timestamp < this.cacheTTLms) {
      return of(cached.data);
    }

    let params = new HttpParams();

    if (filters.keyword) params = params.set('keyword', filters.keyword);
    if (filters.healthIndicator) params = params.set('healthIndicator', filters.healthIndicator);
    if (filters.category) params = params.set('category', filters.category);
    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.skip !== undefined) params = params.set('skip', filters.skip.toString());

    return this.http.get<any>(`${this.apiUrl}/blogs`, { params }).pipe(
      map((res) => {
        const blogs = Array.isArray(res?.blogs)
          ? res.blogs.map((b: any) => {
            let pImg = b.primaryImage;
            if (typeof pImg === 'string') pImg = { url: pImg };

            return {
              ...b,
              primaryImage: (pImg && pImg.url)
                ? { ...pImg, url: this.normalizeImageUrl(pImg.url) }
                : null,
              image: this.normalizeImageUrl(b.image) || b.image,
              imageUrl: this.normalizeImageUrl(b.imageUrl) || b.imageUrl,
            };
          })
          : [];
        return { ...res, blogs };
      }),
      tap((data) => {
        this.cache.set(key, { timestamp: Date.now(), data });
      })
    );
  }

  /** Lấy chi tiết 1 bài viết theo slug - có cache để hiển thị nhanh chóng */
  getBlogBySlug(slug: string): Observable<any> {
    const clean = (s: string) => {
      let v = String(s || '').trim();
      v = v.replace(/^bai-viet\//i, '');
      v = v.replace(/\.html?$/i, '');
      return v;
    };
    const id = clean(slug);
    if (!id) return of({ message: 'Not found' });

    const now = Date.now();
    const cached = this.cacheBySlug.get(id);
    if (cached && now - cached.timestamp < this.cacheBySlugTTLms) {
      return of(cached.data);
    }

    return this.http.get<any>(`${this.apiUrl}/blogs/${encodeURIComponent(id)}`).pipe(
      map((b) => {
        if (!b || b.message === 'Not found') return b;

        let pImg = b.primaryImage;
        if (typeof pImg === 'string') pImg = { url: pImg };

        return {
          ...b,
          primaryImage: (pImg && pImg.url)
            ? { ...pImg, url: this.normalizeImageUrl(pImg.url) }
            : null,
          image: this.normalizeImageUrl(b.image) || b.image,
          imageUrl: this.normalizeImageUrl(b.imageUrl) || b.imageUrl,
        };
      }),
      tap((data) => {
        if (data && !data.message) {
          this.cacheBySlug.set(id, { timestamp: Date.now(), data });
        }
      })
    );
  }
}
