import { Injectable } from '@angular/core';
import { CartItem } from './cart.service';

/**
 * Dùng để truyền dữ liệu sang màn hình consultation.
 * - Từ giỏ hàng: danh sách sản phẩm đã tick.
 * - Từ danh sách đơn thuốc: thông tin liên hệ, thuốc, ảnh, ghi chú để "Tư vấn lại".
 */
@Injectable({ providedIn: 'root' })
export class ConsultationCartService {
  private items: CartItem[] = [];

  // Dữ liệu prefill khi "Tư vấn lại" từ đơn thuốc
  private fromPrescription:
    | {
        contactName?: string;
        contactPhone?: string;
        note?: string;
        products?: {
          productName: string;
          quantity?: number;
          unit?: string;
          image?: string;
          _id?: string;
        }[];
        images?: string[];
      }
    | null = null;

  setProductsFromCart(items: CartItem[]): void {
    this.items = items ? [...items] : [];
  }

  getProductsFromCart(): CartItem[] {
    return this.items;
  }

  clear(): void {
    this.items = [];
  }

  setFromPrescription(data: {
    contactName?: string;
    contactPhone?: string;
    note?: string;
    products?: {
      productName: string;
      quantity?: number;
      unit?: string;
      image?: string;
      _id?: string;
    }[];
    images?: string[];
  }): void {
    this.fromPrescription = data ? { ...data } : null;
  }

  getFromPrescription():
    | {
        contactName?: string;
        contactPhone?: string;
        note?: string;
        products?: {
          productName: string;
          quantity?: number;
          unit?: string;
          image?: string;
          _id?: string;
        }[];
        images?: string[];
      }
    | null {
    return this.fromPrescription ? { ...this.fromPrescription } : null;
  }

  clearFromPrescription(): void {
    this.fromPrescription = null;
  }
}
