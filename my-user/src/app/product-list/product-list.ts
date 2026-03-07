import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CartService } from '../services/cart.service';
import { CartAnimationService } from '../services/cart-animation.service';
import { BuyNowService } from '../services/buy-now.service';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './product-list.html',
  styleUrl: './product-list.css',
})
export class ProductList implements OnChanges {
  @Input() products: any[] = [];
  @Input() total: number = 0;
  @Input() isLoading: boolean = false;
  @Input() activeSort: string = 'newest';

  @Output() sortChange = new EventEmitter<string>();
  @Output() loadMoreEvent = new EventEmitter<void>();
  @Output() itemClick = new EventEmitter<any>();
  @Input() activeFilters: any = {};
  @Output() removeFilter = new EventEmitter<any>();
  @Output() clearAllFilters = new EventEmitter<void>();

  viewMode: 'grid' | 'list' = 'grid';
  showPriceSortDropdown = false;

  constructor(
    private cdr: ChangeDetectorRef,
    private cartService: CartService,
    private cartAnimation: CartAnimationService,
    private buyNowService: BuyNowService
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    this.cdr.detectChanges();
  }

  setViewMode(mode: 'grid' | 'list') {
    this.viewMode = mode;
  }

  onSort(sortType: string) {
    this.sortChange.emit(sortType);
    this.showPriceSortDropdown = false;
  }

  onLoadMore() {
    this.loadMoreEvent.emit();
  }

  handleItemClick(product: any) {
    this.itemClick.emit(product);
  }

  get activeFilterTags(): any[] {
    const tags: any[] = [];
    const f = this.activeFilters;
    if (!f) return tags;

    // Brand
    if (f.brand) {
      tags.push({ type: 'brand', label: f.brand, value: f.brand });
    }

    // Price
    if (f.minPrice !== null || f.maxPrice !== null) {
      let label = '';
      if (f.minPrice === 0 && f.maxPrice) label = `Dưới ${f.maxPrice.toLocaleString()}đ`;
      else if (f.minPrice && f.maxPrice) label = `${f.minPrice.toLocaleString()}đ - ${f.maxPrice.toLocaleString()}đ`;
      else if (f.minPrice && !f.maxPrice) label = `Trên ${f.minPrice.toLocaleString()}đ`;

      if (label) tags.push({ type: 'price', label: label, value: { min: f.minPrice, max: f.maxPrice } });
    }

    // Array filters
    ['audience', 'origin', 'flavor', 'indication', 'brandOrigin'].forEach(key => {
      if (f[key] && Array.isArray(f[key])) {
        f[key].forEach((val: string) => {
          tags.push({ type: key, label: val, value: val });
        });
      }
    });

    return tags;
  }

  onRemoveFilter(tag: any) {
    this.removeFilter.emit(tag);
  }

  onClearAll() {
    this.clearAllFilters.emit();
  }

  isNumber(val: any): boolean {
    return !isNaN(parseFloat(val)) && isFinite(val);
  }

  // Helpers
  getDiscountedPrice(price: number, discount: number): number {
    const d = discount && discount > 0 ? discount : 0;
    return Math.max(0, price - d);
  }

  getDiscountPercentage(price: number, discount: number): number {
    if (!price || price <= 0) return 0;
    if (!discount || discount <= 0) return 0;
    return Math.round((discount / price) * 100);
  }

  handleImageError(event: any) {
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
    // Fallback sang slug nếu không có _id
    if (product.slug && product.slug.trim() !== '') return product.slug;
    return '';
  }

  addToCart(product: any, event?: MouseEvent): void {
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

    if (event) {
      const btn = (event.target as HTMLElement).closest('button') || event.target as HTMLElement;
      this.cartAnimation.flyToCart(btn as HTMLElement);
    }
  }

  buyNow(product: any): void {
    if (!product) return;
    this.buyNowService.buyNow(product, 1);
  }

  trackByProduct(index: number, item: any): string {
    return item._id?.$oid || item._id || index.toString();
  }
}
