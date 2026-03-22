import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, forkJoin, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { of } from 'rxjs';
import { AuthService } from './auth.service';
import { OrderService } from './order.service';
import { CustomerService } from './customer.service';
import { ProductService } from './product.service';
import { ConsultationService } from './consultation.service';
import { PromotionService } from './promotion.service';
import { BlogService } from './blog.service';
import { DiseaseService } from './disease.service';

/**
 * Tải trước dữ liệu trang Tổng quan sau đăng nhập và báo tiến độ cho thanh loading / mascot.
 */
@Injectable({ providedIn: 'root' })
export class DashboardPreloadService {
  /** 0–100, cập nhật theo từng API hoàn thành */
  readonly progress$ = new BehaviorSubject(0);

  private cachedResults: any | null = null;
  private readonly streamCount = 11;

  constructor(
    private authService: AuthService,
    private orderService: OrderService,
    private customerService: CustomerService,
    private productService: ProductService,
    private consultationService: ConsultationService,
    private promotionService: PromotionService,
    private blogService: BlogService,
    private diseaseService: DiseaseService
  ) {}

  /**
   * Gọi cùng bộ API với Home.loadData; lưu kết quả để Home.consumeCachedResults().
   */
  preload(): Observable<any> {
    this.cachedResults = null;
    let done = 0;
    const bump = () => {
      done = Math.min(this.streamCount, done + 1);
      this.progress$.next(Math.round((done / this.streamCount) * 100));
    };

    const track = <T>(source: Observable<T>) =>
      source.pipe(
        tap({
          next: () => bump(),
          error: () => bump()
        })
      );

    this.progress$.next(0);

    return forkJoin({
      stats: track(this.authService.getStats()),
      orders: track(this.orderService.getOrders()),
      customers: track(this.customerService.getCustomers()),
      products: track(this.productService.getAllProducts()),
      prescriptions: track(this.consultationService.getPrescriptionConsultations()),
      promotions: track(this.promotionService.getPromotions()),
      blogs: track(this.blogService.getBlogs(1, 500)),
      diseases: track(this.diseaseService.getDiseases(1, 500)),
      productConsults: track(
        this.consultationService.getProductConsultations().pipe(catchError(() => of({ data: [] })))
      ),
      diseaseConsults: track(
        this.consultationService.getDiseaseConsultations().pipe(
          catchError(() => of({ success: true, data: [] }))
        )
      )
    }).pipe(
      tap((results) => {
        this.cachedResults = results;
        this.progress$.next(100);
      }),
      catchError((err) => {
        this.progress$.next(100);
        return throwError(() => err);
      })
    );
  }

  /** Home gọi một lần sau đăng nhập; trả về null nếu không có cache. */
  consumeCachedResults(): any | null {
    const r = this.cachedResults;
    this.cachedResults = null;
    return r;
  }
}
