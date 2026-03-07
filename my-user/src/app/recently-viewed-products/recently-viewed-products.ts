import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CartService } from '../services/cart.service';
import { CartAnimationService } from '../services/cart-animation.service';
import { BuyNowService } from '../services/buy-now.service';

@Component({
  selector: 'app-recently-viewed-products',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './recently-viewed-products.html',
  styleUrls: ['../product/product.css'],
})
export class RecentlyViewedProducts {
  @Input() products: any[] = [];

  @Output() clearAll = new EventEmitter<void>();
  @Output() productClick = new EventEmitter<any>();

  constructor(
    private cartService: CartService,
    private cartAnimation: CartAnimationService,
    private buyNowService: BuyNowService
  ) {}

  onClearAll(): void {
    this.clearAll.emit();
  }

  onProductClick(product: any): void {
    this.productClick.emit(product);
  }

  addToCart(product: any, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    this.cartService.addItem({
      _id: product?._id || product?.id,
      sku: product?.sku || '',
      productName: product?.name || product?.productName || '',
      name: product?.name || '',
      image: product?.image || '',
      price: this.getDiscountedPrice(product?.price || 0, product?.discount || 0),
      discount: product?.discount || 0,
      unit: product?.unit || 'Hộp',
      slug: this.getProductSlug(product),
    }, 1);

    const btn = (event.target as HTMLElement).closest('button') || event.target as HTMLElement;
    this.cartAnimation.flyToCart(btn as HTMLElement);
  }

  buyNow(product: any, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!product) return;
    this.buyNowService.buyNow(product, 1);
  }

  getDiscountedPrice(price: number, discount: number): number {
    return price - (discount || 0);
  }

  getDiscountPercentage(price: number, discount: number): number {
    if (!discount || !price || price <= 0) return 0;
    return Math.round((discount / price) * 100);
  }

  handleImageError(event: any): void {
    event.target.src = 'assets/images/banner/About_us_Hero.png';
  }

  getProductSlug(product: any): string {
    if (!product) return '';
    // Ưu tiên _id để điều hướng đáng tin cậy (backend tìm theo ObjectId)
    if (product._id) {
      if (typeof product._id === 'string') return product._id;
      if (product._id.$oid) return product._id.$oid;
      if (typeof product._id.toString === 'function') return product._id.toString();
    }
    if (product.slug && product.slug.trim() !== '') return product.slug;
    return '';
  }
}

