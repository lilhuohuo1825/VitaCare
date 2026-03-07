import { Component, ElementRef, ViewChild, inject, OnInit, signal, effect, untracked, Input, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { OrderService, Order as BackendOrder } from '../services/order.service';
import { AuthService } from '../services/auth.service';
import { OrderDetailAcc } from '../order-detail-acc/order-detail-acc';

interface OrderProduct {
  id: string;
  name: string;
  image: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  unit: string;
  totalPrice: number;
  category?: string;
  gifted?: boolean;
  parentId?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  orderDate: string;
  // Đồng bộ với Order trong order-detail-acc.ts
  status:
    | 'pending'
    | 'confirmed'
    | 'shipping'
    | 'delivered'
    | 'received'
    | 'completed'
    | 'cancelled'
    | 'refund_rejected'
    | 'unreview'
    | 'reviewed'
    | 'processing_return'
    | 'returning'
    | 'returned';
  totalAmount: number;
  products: OrderProduct[];
  isReviewed?: boolean;
  isReturned?: boolean;
}

interface Tab {
  id: 'all' | 'pending' | 'shipping' | 'delivered' | 'cancelled';
  label: string;
  count: number;
}

interface ReturnReason {
  value: string;
  label: string;
}

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, OrderDetailAcc],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
export class Orders implements OnInit, OnChanges {
  private router = inject(Router);
  private orderService = inject(OrderService);
  private authService = inject(AuthService); // Kept for other needs if any

  @Input() userId: string | undefined;

  // Search
  searchQuery: string = '';
  @ViewChild('searchInput') searchInput!: ElementRef;

  // Order Detail Modal
  @ViewChild(OrderDetailAcc) orderDetailModal!: OrderDetailAcc;

  // Tabs
  activeTab: string = 'all';
  tabs: Tab[] = [
    { id: 'all', label: 'Tất cả', count: 0 },
    { id: 'pending', label: 'Chờ xác nhận', count: 0 },
    { id: 'shipping', label: 'Chờ giao hàng', count: 0 },
    { id: 'delivered', label: 'Đã giao hàng', count: 0 },
    { id: 'cancelled', label: 'Đã hủy', count: 0 },
  ];
  @ViewChild('tabList') tabList!: ElementRef;
  canScrollLeft = false;
  canScrollRight = true;

  // Orders Data
  orders: Order[] = [];
  isLoading = true;

  // UI State
  expandedOrders: Set<string> = new Set();

  // Return Modal State
  showReturnModal = false;
  selectedOrder: Order | null = null;
  isModalExpanded = false;
  showReasonDropdown = false;
  selectedReason: string = '';
  detailedDescription: string = '';
  reasonDropdownPosition = { top: 0, left: 0, width: 0 };
  @ViewChild('reasonDropdownButton') reasonDropdownButton!: ElementRef;

  returnReasonOptions: ReturnReason[] = [
    { value: 'wrong_item', label: 'Giao sai sản phẩm' },
    { value: 'damaged', label: 'Sản phẩm bị lỗi/hư hỏng' },
    { value: 'expired', label: 'Sản phẩm hết hạn sử dụng' },
    { value: 'other', label: 'Khác' },
  ];

  // Other Modals State
  showSuccessModal = false;
  showCancelModal = false;
  showCancelOrderModal = false;
  showConfirmReceivedModal = false;
  showReviewModal = false;

  cancelReason: string = '';
  reviewProducts: any[] = [];

  // Cancel Order Reason Selection
  selectedCancelReason: string = '';
  cancelDetailedReason: string = '';
  showCancelReasonDropdown = false;
  cancelReasonDropdownPosition = { top: 0, left: 0, width: 0 };
  @ViewChild('cancelReasonDropdownButton') cancelReasonDropdownButton!: ElementRef;

  cancelReasonOptions: ReturnReason[] = [
    { value: 'wrong_product', label: 'Đặt nhầm sản phẩm' },
    { value: 'cheaper_price', label: 'Tìm được giá rẻ hơn' },
    { value: 'long_delivery', label: 'Thời gian giao hàng quá lâu' },
    { value: 'changed_mind', label: 'Đổi ý, không muốn mua nữa' },
    { value: 'other', label: 'Khác' },
  ];

  constructor() {
    // Constructor logic if any
  }

  private cdr = inject(ChangeDetectorRef); // Inject ChangeDetectorRef

  ngOnInit(): void {
    // Removed redundant fetchOrders call as ngOnChanges handles it
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['userId'] && this.userId) {
      this.fetchOrders(this.userId);
    }
  }

  fetchOrders(userId: string): void {
    this.isLoading = true;
    this.orderService.getOrders(userId).subscribe({
      next: (res) => {
        if (res.success) {
          this.orders = res.items.map(backendOrder => this.mapBackendOrder(backendOrder));
          this.updateTabCounts();
        }
        this.isLoading = false;
        this.cdr.detectChanges(); // Manually trigger change detection
      },
      error: (err) => {
        console.error('OrdersComponent: Failed to fetch orders', err);
        this.isLoading = false;
        this.cdr.detectChanges(); // Manually trigger change detection
      }
    });
  }

  private mapBackendOrder(backendOrder: BackendOrder): Order {
    // Determine order date (use pending date or fallback to current)
    const orderDate = backendOrder.route?.pending || new Date().toISOString();

    // Map products
    const products: OrderProduct[] = (backendOrder.item || []).map((item, index) => ({
      id: `${backendOrder.order_id}_${index}`, // Generate a unique ID for product item
      name: item.productName,
      image: item.image, // Use the image URL from backend
      price: item.price,
      quantity: item.quantity,
      unit: item.unit,
      totalPrice: item.price * item.quantity,
      category: '', // Not available in orders.json
      gifted: false, // Default false
    }));

    // Normalize status (chấp nhận đầy đủ các trạng thái dùng trong account)
    let status: any = backendOrder.status;
    if (
      ![
        'pending',
        'confirmed',
        'shipping',
        'delivered',
        'received',
        'completed',
        'cancelled',
        'refund_rejected',
        'unreview',
        'reviewed',
      ].includes(status)
    ) {
      status = 'pending'; // Fallback
    }

    return {
      id: backendOrder._id || backendOrder.order_id,
      orderNumber: backendOrder.order_id,
      orderDate: orderDate,
      status: status,
      totalAmount: backendOrder.totalAmount,
      products: products,
      isReviewed: false, // Default
      isReturned: false // Default
    };
  }

  // --- Search & Filter ---
  performSearch(): void {
    // console.log('Searching for:', this.searchQuery);
  }

  clearSearch(): void {
    this.searchQuery = '';
    if (this.searchInput) this.searchInput.nativeElement.focus();
  }

  getFilteredOrders(): Order[] {
    let filtered = this.orders;

    // Filter by Tab
    if (this.activeTab !== 'all') {
      if (this.activeTab === 'delivered') {
        // Tab "Đã giao hàng" hiển thị cả các đơn đã giao, đã hoàn thành
        // và các đơn "unreview" / "reviewed".
        filtered = filtered.filter(o =>
          o.status === 'delivered' ||
          o.status === 'completed' ||
          o.status === 'unreview' ||
          o.status === 'reviewed'
        );
      } else {
        filtered = filtered.filter(o => o.status === this.activeTab);
      }
    }

    // Filter by Search Query
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(
        o =>
          o.orderNumber.toLowerCase().includes(query) ||
          o.products.some(p => p.name.toLowerCase().includes(query))
      );
    }

    // Sort by date (newest first) seems already sorted by backend, but redundant sort is safe
    return filtered.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
  }

  // --- Tabs ---
  updateTabCounts(): void {
    const allOrders = this.orders;
    this.tabs.forEach(tab => {
      if (tab.id === 'all') {
        tab.count = allOrders.length;
      } else if (tab.id === 'delivered') {
        // Số hiển thị trên tab "Đã giao hàng" chỉ đếm các đơn có status = 'delivered'
        tab.count = allOrders.filter(o => o.status === 'delivered').length;
      } else {
        tab.count = allOrders.filter(o => o.status === tab.id).length;
      }
    });
  }

  onTabClick(tabId: string): void {
    this.activeTab = tabId;
  }

  scrollTabs(offset: number): void {
    if (this.tabList) {
      this.tabList.nativeElement.scrollBy({ left: offset, behavior: 'smooth' });
      setTimeout(() => this.checkScroll(), 300);
    }
  }

  checkScroll() {
    if (!this.tabList) return;
    const el = this.tabList.nativeElement;
    this.canScrollLeft = el.scrollLeft > 0;
    this.canScrollRight = el.scrollLeft < el.scrollWidth - el.clientWidth;
  }

  // --- Display Helpers ---
  getDisplayStatusLabel(order: Order): string {
    switch (order.status) {
      case 'pending':
        return 'Chờ xác nhận';
      case 'shipping':
        return 'Đang giao hàng';
      case 'delivered':
        return 'Đã giao hàng';
      case 'received':
        return 'Đã nhận hàng';
      case 'unreview':
        // Đơn đã giao thành công, đang chờ đánh giá
        return 'Giao hàng thành công';
      case 'reviewed':
        // Đơn đã được đánh giá xong
        return 'Đã đánh giá';
      case 'completed':
        return 'Hoàn thành';
      case 'cancelled':
        return 'Đã hủy';
      default:
        return '';
    }
  }

  getDisplayStatusClass(order: Order): string {
    return `status-${order.status}`;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  }

  getTotalQuantity(order: Order): number {
    return order.products.reduce((sum, p) => sum + p.quantity, 0);
  }

  // --- Order Logic ---
  hasMoreProducts(order: Order): boolean {
    return order.products.length > 2;
  }

  isOrderExpanded(order: Order): boolean {
    return this.expandedOrders.has(order.id);
  }

  onViewMore(order: Order): void {
    if (this.expandedOrders.has(order.id)) {
      this.expandedOrders.delete(order.id);
    } else {
      this.expandedOrders.add(order.id);
    }
  }

  getDisplayProducts(order: Order): OrderProduct[] {
    const mainProducts = order.products.filter(p => !p.gifted);
    if (this.isOrderExpanded(order)) {
      return mainProducts;
    }
    return mainProducts.slice(0, 1);
  }

  hasGiftedProduct(product: OrderProduct, order: Order): boolean {
    return order.products.some(p => p.gifted && p.parentId === product.id);
  }

  getGiftedProduct(product: OrderProduct, order: Order): OrderProduct | undefined {
    return order.products.find(p => p.gifted && p.parentId === product.id);
  }

  viewOrderDetails(order: Order): void {
    if (this.orderDetailModal) {
      this.orderDetailModal.openModal(this.orders, order.id);
    }
  }

  // --- Modal: Return / Refund ---
  onReturnRefund(order: Order): void {
    this.selectedOrder = order;
    this.selectedReason = '';
    this.detailedDescription = '';
    this.showReturnModal = true;
    this.isModalExpanded = false;
  }

  closeReturnModal(): void {
    this.showReturnModal = false;
    this.selectedOrder = null;
  }

  submitReturnRequest(): void {
    if (!this.selectedOrder) return;
    const order = this.selectedOrder;
    const reasonLabel = this.getReasonLabel(this.selectedReason);
    const detail = this.selectedReason === 'other' ? this.detailedDescription : '';
    this.orderService.requestReturn(order.orderNumber, reasonLabel, detail).subscribe({
      next: () => {
        order.status = 'processing_return';
        order.isReturned = true;
        this.updateTabCounts();
        this.showReturnModal = false;
        this.showSuccessModal = true;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Request return error:', err);
        order.isReturned = true;
        this.showReturnModal = false;
        this.showSuccessModal = true;
        this.cdr.detectChanges();
      },
    });
  }

  canSubmit(): boolean {
    if (!this.selectedReason) return false;
    if (this.selectedReason === 'other' && !this.detailedDescription.trim()) return false;
    return true;
  }

  toggleReasonDropdown(event: Event): void {
    event.stopPropagation();
    this.showReasonDropdown = !this.showReasonDropdown;
    if (this.showReasonDropdown && this.reasonDropdownButton) {
      const rect = this.reasonDropdownButton.nativeElement.getBoundingClientRect();
      this.reasonDropdownPosition = {
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      };
    }
  }

  selectReason(value: string, event: Event): void {
    event.stopPropagation();
    this.selectedReason = value;
    this.showReasonDropdown = false;
  }

  getReasonLabel(value: string): string {
    const reason = this.returnReasonOptions.find(r => r.value === value);
    return reason ? reason.label : '';
  }

  getModalDisplayProducts(): OrderProduct[] {
    if (!this.selectedOrder) return [];
    const mainProducts = this.selectedOrder.products.filter(p => !p.gifted);
    if (this.isModalExpanded) return mainProducts;
    return mainProducts.slice(0, 2);
  }

  hasMoreModalProducts(): boolean {
    if (!this.selectedOrder) return false;
    return this.selectedOrder.products.filter(p => !p.gifted).length > 2;
  }

  toggleModalProducts(): void {
    this.isModalExpanded = !this.isModalExpanded;
  }

  // --- Modal: Cancel Order ---
  onCancelOrder(order: Order): void {
    this.selectedOrder = order;
    this.cancelReason = '';
    this.selectedCancelReason = '';
    this.cancelDetailedReason = '';
    this.showCancelOrderModal = true;
  }

  closeCancelOrderModal(): void {
    this.showCancelOrderModal = false;
    this.selectedOrder = null;
    this.showCancelReasonDropdown = false;
  }

  confirmCancelOrder(): void {
    if (!this.canSubmitCancelOrder() || !this.selectedOrder) return;

    const order = this.selectedOrder;
    const reason = this.selectedCancelReason === 'other'
      ? this.cancelDetailedReason
      : this.getCancelReasonLabel(this.selectedCancelReason);

    // Gửi orderNumber (order_id trên MongoDB) để backend tìm đúng đơn
    this.orderService.cancelOrder(order.orderNumber).subscribe({
      next: () => {
        order.status = 'cancelled';
        this.updateTabCounts();
        this.closeCancelOrderModal();
        this.showSuccessModal = true;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Cancel order API error:', err);
        // Vẫn cập nhật local khi backend báo lỗi format (trạng thái đã giao v.v.)
        order.status = 'cancelled';
        this.updateTabCounts();
        this.closeCancelOrderModal();
        this.showSuccessModal = true;
        this.cdr.detectChanges();
      },
    });
  }

  toggleCancelReasonDropdown(event: Event): void {
    event.stopPropagation();
    this.showCancelReasonDropdown = !this.showCancelReasonDropdown;
    if (this.showCancelReasonDropdown && this.cancelReasonDropdownButton) {
      const rect = this.cancelReasonDropdownButton.nativeElement.getBoundingClientRect();
      this.cancelReasonDropdownPosition = {
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      };
    }
  }

  selectCancelReason(value: string, event: Event): void {
    event.stopPropagation();
    this.selectedCancelReason = value;
    this.showCancelReasonDropdown = false;
    // Clear detailed reason if not "other"
    if (value !== 'other') {
      this.cancelDetailedReason = '';
    }
  }

  getCancelReasonLabel(value: string): string {
    const reason = this.cancelReasonOptions.find(r => r.value === value);
    return reason ? reason.label : '';
  }

  canSubmitCancelOrder(): boolean {
    if (!this.selectedCancelReason) return false;
    if (this.selectedCancelReason === 'other' && !this.cancelDetailedReason.trim()) return false;
    return true;
  }

  // --- Modal: Confirm Received ---
  confirmReceivedOrder(order: Order): void {
    this.selectedOrder = order;
    this.showConfirmReceivedModal = true;
  }

  closeConfirmReceivedModal(): void {
    this.showConfirmReceivedModal = false;
    this.selectedOrder = null;
  }

  executeConfirmReceivedOrder(): void {
    if (!this.selectedOrder) return;

    const order = this.selectedOrder;
    // Gửi orderNumber (trùng với order_id trên MongoDB) cho backend
    this.orderService.confirmReceived(order.orderNumber).subscribe({
      next: () => {
        order.status = 'unreview';
        this.updateTabCounts();
        this.closeConfirmReceivedModal();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Confirm received API error:', err);
        // Dù backend lỗi, vẫn cập nhật local sang trạng thái "unreview"
        // để user có thể đánh giá đơn hàng.
        order.status = 'unreview';
        this.updateTabCounts();
        this.closeConfirmReceivedModal();
        this.cdr.detectChanges();
      },
    });
  }

  // --- Other Actions ---
  onRepurchaseOrder(order: Order): void {
    console.log('Repurchase', order.id);
  }

  onRate(order: Order): void {
    console.log('Rate order', order.id);
    this.showReviewModal = true;
    this.reviewProducts = order.products.filter(p => !p.gifted);
  }

  hasOrderBeenReviewed(order: Order): boolean {
    return !!order.isReviewed;
  }

  hasOrderBeenReturned(order: Order): boolean {
    return !!order.isReturned;
  }

  closeSuccessModal(): void {
    this.showSuccessModal = false;
  }

  closeCancelModal(): void {
    this.showCancelModal = false;
  }

  startCancelReturnRequest(): void {
    this.showCancelModal = true;
  }

  confirmCancelRequest(): void {
    this.showReturnModal = false;
    this.showCancelModal = false;
  }

  closeReviewModal() {
    this.showReviewModal = false;
  }

  submitReview(event: any) {
    if (this.selectedOrder) {
      this.selectedOrder.isReviewed = true;
    }
    this.closeReviewModal();
  }
}

