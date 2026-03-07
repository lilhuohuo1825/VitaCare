import { Component, OnInit, inject, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ConsultationCartService } from '../services/consultation-cart.service';
import { ProductService } from '../services/product.service';
import { CategoryService } from '../services/category.service';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

export interface ConsultationProduct {
  productName: string;
  quantity?: number;
  unit?: string;
  image?: string;
  fromCart?: boolean;
  _id?: string;
}

@Component({
  selector: 'app-consultation',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './consultation.html',
  styleUrl: './consultation.css',
})
export class Consultation implements OnInit {
  private consultationCartService = inject(ConsultationCartService);
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private cdr = inject(ChangeDetectorRef);
  readonly authService = inject(AuthService);
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private router = inject(Router);

  @ViewChild('prescriptionFileInput') prescriptionFileInput?: ElementRef<HTMLInputElement>;

  contactName = '';
  contactPhone = '';
  contactNote = '';
  /** Lỗi hiển thị dưới ô Số điện thoại (màu đỏ) */
  contactPhoneError = '';
  /** Ảnh đơn thuốc đã tải (data URL để preview, gửi lên server khi submit) */
  prescriptionImages: string[] = [];

  /** Thuốc/sản phẩm cần tư vấn: từ giỏ hàng (bấm "Tư vấn đơn thuốc") + thêm tay */
  productsForConsultation: ConsultationProduct[] = [];

  /** Popup thêm sản phẩm */
  showAddProductModal = false;
  searchKeyword = '';
  selectedCategorySlug = '';
  selectedMinPrice: number | null = null;
  selectedMaxPrice: number | null = null;
  categories: { _id: string; name: string; slug: string }[] = [];
  searchProducts: any[] = [];
  searchLoading = false;
  selectedPriceRangeIndex = 0;
  priceRanges = [
    { label: 'Tất cả giá', min: null as number | null, max: null as number | null },
    { label: 'Dưới 100.000đ', min: 0, max: 100000 },
    { label: '100.000đ - 300.000đ', min: 100000, max: 300000 },
    { label: '300.000đ - 500.000đ', min: 300000, max: 500000 },
    { label: 'Trên 500.000đ', min: 500000, max: null },
  ];

  /** Popup thông báo tạo đơn thuốc tư vấn thành công */
  showPrescriptionSuccess = false;
  successPrescriptionId = '';

  ngOnInit(): void {
    const fromCart = this.consultationCartService.getProductsFromCart();
    if (fromCart?.length) {
      this.productsForConsultation = fromCart.map(i => ({
        productName: i.productName,
        quantity: i.quantity ?? 1,
        unit: i.unit ?? 'SP',
        image: i.image,
        fromCart: true,
        _id: i._id,
      }));
      this.consultationCartService.clear();
    }

    // Prefill từ đơn thuốc (Tư vấn lại)
    const fromPrescription = this.consultationCartService.getFromPrescription();

    const user = this.authService.currentUser();
    if (user) {
      this.contactName = (user.full_name as string) ?? '';
      this.contactPhone = (user.phone as string) ?? '';
    } else {
      this.contactName = '';
      this.contactPhone = '';
    }

    if (fromPrescription) {
      if (fromPrescription.contactName) {
        this.contactName = fromPrescription.contactName;
      }
      if (fromPrescription.contactPhone) {
        this.contactPhone = fromPrescription.contactPhone;
      }
      if (fromPrescription.note) {
        this.contactNote = fromPrescription.note;
      }
      if (Array.isArray(fromPrescription.products) && fromPrescription.products.length) {
        this.productsForConsultation = [
          ...this.productsForConsultation,
          ...fromPrescription.products.map((p) => ({
            productName: p.productName,
            quantity: p.quantity ?? 1,
            unit: p.unit ?? 'SP',
            image: p.image,
            _id: p._id,
          })),
        ];
      }
      if (Array.isArray(fromPrescription.images) && fromPrescription.images.length) {
        this.prescriptionImages = [...fromPrescription.images];
      }
      this.consultationCartService.clearFromPrescription();
    }

    this.loadCategories();
  }

  loadCategories(): void {
    this.categoryService.getCategoriesLevel1().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data ?? res?.items ?? []);
        this.categories = (list || []).map((c: any) => ({ _id: c._id, name: c.name, slug: c.slug || '' }));
        this.cdr.detectChanges();
      },
      error: () => {
        this.categories = [];
        this.cdr.detectChanges();
      },
    });
  }

  addPrescriptionImage(): void {
    this.prescriptionFileInput?.nativeElement?.click();
  }

  onPrescriptionFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files?.length) return;
    const maxSize = 5 * 1024 * 1024; // 5MB
    const maxCount = 5;
    for (let i = 0; i < Math.min(files.length, maxCount - this.prescriptionImages.length); i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;
      if (file.size > maxSize) continue;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        this.prescriptionImages.push(dataUrl);
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
    input.value = '';
  }

  removePrescriptionImage(index: number): void {
    this.prescriptionImages.splice(index, 1);
    this.cdr.detectChanges();
  }

  addMedicine(): void {
    this.showAddProductModal = true;
    this.searchKeyword = '';
    this.selectedCategorySlug = '';
    this.selectedPriceRangeIndex = 0;
    this.onPriceRangeChange();
    this.searchProducts = [];
    this.runSearch();
  }

  closeAddProductModal(): void {
    this.showAddProductModal = false;
  }

  runSearch(): void {
    this.searchLoading = true;
    const filters: any = {
      limit: 24,
      page: 1,
      sort: 'newest',
    };
    if (this.searchKeyword != null && this.searchKeyword.trim() !== '') {
      filters.keyword = this.searchKeyword.trim();
    }
    if (this.selectedCategorySlug != null && this.selectedCategorySlug !== '') {
      filters.categorySlug = this.selectedCategorySlug;
    }
    if (this.selectedMinPrice != null) filters.minPrice = this.selectedMinPrice;
    if (this.selectedMaxPrice != null) filters.maxPrice = this.selectedMaxPrice;

    this.productService.getProducts(filters).subscribe({
      next: (res: any) => {
        this.searchProducts = res?.products ?? [];
        this.searchLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn('[Consultation] getProducts error:', err);
        this.searchProducts = [];
        this.searchLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  onPriceRangeChange(): void {
    const r = this.priceRanges[this.selectedPriceRangeIndex];
    if (r) {
      this.selectedMinPrice = r.min;
      this.selectedMaxPrice = r.max;
    }
  }

  onFilterChange(): void {
    this.onPriceRangeChange();
    this.runSearch();
  }

  selectProductForConsultation(product: any): void {
    const name = product.name || product.productName || '';
    if (!name) return;
    this.productsForConsultation.push({
      productName: name,
      quantity: 1,
      unit: product.unit || 'Hộp',
      image: product.image,
      _id: product._id,
    });
    this.cdr.detectChanges();
  }

  removeProduct(index: number): void {
    this.productsForConsultation.splice(index, 1);
  }

  /** Ràng buộc SĐT: ít nhất 10 chữ số, chỉ số. Trả về true nếu hợp lệ. */
  validateContactPhone(): boolean {
    const raw = (this.contactPhone || '').trim();
    if (raw === '') {
      this.contactPhoneError = 'Vui lòng nhập số điện thoại.';
      this.cdr.detectChanges();
      return false;
    }
    const digitsOnly = raw.replace(/\s/g, '');
    if (!/^\d+$/.test(digitsOnly)) {
      this.contactPhoneError = 'Số điện thoại chỉ được chứa chữ số.';
      this.cdr.detectChanges();
      return false;
    }
    if (digitsOnly.length < 10) {
      this.contactPhoneError = 'Số điện thoại phải có ít nhất 10 chữ số.';
      this.cdr.detectChanges();
      return false;
    }
    this.contactPhoneError = '';
    this.cdr.detectChanges();
    return true;
  }

  submitRequest(): void {
    if (!this.contactName.trim()) {
      this.toast.showError('Vui lòng nhập họ tên.');
      return;
    }
    if (!this.validateContactPhone()) return;

    const user = this.authService.currentUser();
    const userId = (user as any)?.user_id as string | undefined;

    const payload: any = {
      user_id: userId || null,
      full_name: this.contactName.trim(),
      phone: this.contactPhone.trim(),
      note: this.contactNote?.trim() || '',
      consultation_type: 'online',
      images: [...this.prescriptionImages],
      medicines_requested: this.productsForConsultation.map((p) => ({
        id: p._id,
        name: p.productName,
        sku: '',
        image: p.image,
      })),
    };

    this.http
      .post<{ success: boolean; prescriptionId?: string; item?: any; message?: string }>(
        'http://localhost:3000/api/prescriptions',
        payload,
      )
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.successPrescriptionId = res.prescriptionId || res.item?.prescriptionId || '';
            this.showPrescriptionSuccess = true;
            // Sau khi gửi thành công có thể reset ghi chú, ảnh
            this.contactNote = '';
            this.prescriptionImages = [];
          } else {
            this.toast.showError(res.message || 'Không thể tạo yêu cầu tư vấn đơn thuốc.');
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('[Consultation] submitRequest error:', err);
          this.toast.showError('Lỗi kết nối máy chủ. Vui lòng thử lại.');
          this.cdr.detectChanges();
        },
      });
  }

  closePrescriptionSuccess(): void {
    this.showPrescriptionSuccess = false;
    this.router.navigate(['/']);
  }

  goToPrescriptions(): void {
    this.showPrescriptionSuccess = false;
    this.router.navigate(['/account'], { queryParams: { menu: 'prescriptions' } });
  }
}
