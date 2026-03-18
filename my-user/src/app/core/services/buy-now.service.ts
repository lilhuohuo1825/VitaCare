import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import type { CartItem } from './cart.service';

export interface BuyNowItem {
    _id: string;
    sku: string;
    productName: string;
    quantity: number;
    price: number;
    discount: number;
    image: string;
    unit: string;
    category?: string;
    slug?: string;
    [key: string]: any;
}

const SESSION_KEY = 'vitacare_buy_now';

@Injectable({ providedIn: 'root' })
export class BuyNowService {
    private router = inject(Router);

    private items: BuyNowItem[] = [];

    /**
     * Lưu sản phẩm "Mua ngay" rồi chuyển qua trang đặt hàng.
     * Cho phép cả user đã đăng nhập và khách vãng lai.
     */
    buyNow(product: any, quantity: number = 1): void {
        const item: BuyNowItem = {
            _id: product._id?.$oid || product._id || product.id || '',
            sku: product.sku || '',
            productName: product.name || product.productName || '',
            quantity: Math.max(1, quantity),
            price: Number(product.price) || 0,
            discount: Number(product.discount) || 0,
            image: product.image || '',
            unit: product.unit || 'Hộp',
            category: product.category || '',
            slug: product.slug || '',
        };

        this.items = [item];
        try {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(this.items));
        } catch { /* quota exceeded — ignore */ }

        this.router.navigate(['/order']);
    }

    /**
     * Dùng lại cơ chế "Mua ngay" để truyền danh sách
     * sản phẩm đã chọn từ giỏ hàng sang trang đặt hàng.
     * Cho phép cả user đã đăng nhập và khách vãng lai.
     */
    setItemsFromCart(items: CartItem[]): void {
        const mapped: BuyNowItem[] = (items || []).map((p) => ({
            _id: p._id,
            sku: p.sku || '',
            productName: p.productName || '',
            quantity: Math.max(1, p.quantity || 1),
            price: Number(p.price) || 0,
            discount: Number(p.discount) || 0,
            image: p.image || '',
            unit: p.unit || 'Hộp',
            category: (p as any).category || '',
            slug: (p as any).slug || '',
        }));

        this.items = mapped;
        try {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(this.items));
        } catch { /* ignore quota errors */ }
    }

    getItems(): BuyNowItem[] {
        if (this.items.length > 0) return this.items;
        try {
            const raw = sessionStorage.getItem(SESSION_KEY);
            if (raw) {
                this.items = JSON.parse(raw);
                return this.items;
            }
        } catch { /* ignore */ }
        return [];
    }

    clear(): void {
        this.items = [];
        sessionStorage.removeItem(SESSION_KEY);
    }

    hasItems(): boolean {
        return this.getItems().length > 0;
    }
}
