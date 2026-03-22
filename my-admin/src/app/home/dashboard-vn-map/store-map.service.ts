import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

const API_BASE = 'http://localhost:3000';

export interface DashboardStore {
  _id?: string;
  ma_cua_hang?: string;
  ten_cua_hang?: string;
  loai_hinh?: string;
  dia_chi?: {
    so_nha?: string;
    duong?: string;
    phuong_xa?: string;
    quan_huyen?: string;
    tinh_thanh?: string;
    dia_chi_day_du?: string;
  };
  toa_do?: { lat?: number; lng?: number };
  thong_tin_lien_he?: {
    so_dien_thoai?: string[];
    hotline?: string;
    zalo?: string;
  };
  thoi_gian_hoat_dong?: {
    thu_2_6?: { mo_cua: string; dong_cua: string };
    thu_7?: { mo_cua: string; dong_cua: string };
    chu_nhat?: { mo_cua: string; dong_cua: string };
    ngay_le?: string;
    ghi_chu?: string;
  };
  giao_hang?: boolean;
  ban_kinh_giao_hang?: number;
  danh_gia?: { diem_tb?: number; so_luot?: number; binh_luan_noi_bat?: string[] };
  mo_ta?: string;
  dich_vu?: string[];
  duoc_si?: { ho_ten?: string; trinh_do?: string; kinh_nghiem?: string; chuyen_mon?: string[] };
  giay_phep?: { so_giay_phep?: string; noi_cap?: string; ngay_het_han?: string };
  tien_nghi?: string[];
  phuong_thuc_thanh_toan?: string[];
  trang_thai?: string;
}

interface StoresApiResponse {
  success?: boolean;
  data: DashboardStore[];
  total: number;
  totalPages?: number;
}

@Injectable({ providedIn: 'root' })
export class StoreMapService {
  private readonly http = inject(HttpClient);

  /** Lấy toàn bộ cửa hàng theo tỉnh (phân trang nếu > limit). */
  fetchAllStoresForProvince(tinhThanh: string): Observable<DashboardStore[]> {
    const limit = 500;
    const params = new HttpParams()
      .set('tinh_thanh', tinhThanh)
      .set('limit', String(limit))
      .set('page', '1');

    return this.http.get<StoresApiResponse>(`${API_BASE}/api/stores`, { params }).pipe(
      switchMap((first) => {
        const total = Number(first.total) || 0;
        const data = [...(first.data || [])];
        const totalPages = Math.max(1, Math.ceil(total / limit));
        if (totalPages <= 1) return of(data);

        const rest: Observable<StoresApiResponse>[] = [];
        for (let p = 2; p <= totalPages; p++) {
          const pp = new HttpParams()
            .set('tinh_thanh', tinhThanh)
            .set('limit', String(limit))
            .set('page', String(p));
          rest.push(this.http.get<StoresApiResponse>(`${API_BASE}/api/stores`, { params: pp }));
        }
        return forkJoin(rest).pipe(
          map((pages) => {
            for (const pg of pages) {
              data.push(...(pg.data || []));
            }
            return data;
          })
        );
      })
    );
  }

  /** Thử nhiều biến thể tên tỉnh cho đến khi có dữ liệu. */
  fetchStoresWithVariants(variants: string[]): Observable<{ stores: DashboardStore[]; usedTinh: string }> {
    if (!variants.length) {
      return of({ stores: [], usedTinh: '' });
    }
    const [first, ...others] = variants;
    return this.fetchAllStoresForProvince(first).pipe(
      switchMap((stores) => {
        if (stores.length > 0 || others.length === 0) {
          return of({ stores, usedTinh: first });
        }
        return this.fetchStoresWithVariants(others);
      })
    );
  }
}
