import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewChild,
  effect,
  signal,
  untracked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { OrderService, Order as BackendOrder } from '../../../core/services/order.service';
import { AuthService } from '../../../core/services/auth.service';
import { OrderDetailAcc } from '../order-detail-acc/order-detail-acc';
import { CartService, CartItem } from '../../../core/services/cart.service';
import { CartSidebarService } from '../../../core/services/cart-sidebar.service';
import { ToastService } from '../../../core/services/toast.service';
import { CoinService } from '../../../core/services/coin.service';
import { ProductService } from '../../../core/services/product.service';
import { ReviewFormComponent, ReviewProduct } from '../../../components/review-form/review-form';
import { firstValueFrom } from 'rxjs';

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
  sku?: string;
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
    | 'returning';
  totalAmount: number;
  subtotal?: number;
  directDiscount?: number;
  voucherDiscount?: number;
  shippingFee?: number;
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
  imports: [CommonModule, FormsModule, OrderDetailAcc, ReviewFormComponent],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
export class Orders implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private orderService = inject(OrderService);
  private authService = inject(AuthService); // Kept for other needs if any
  private cartService = inject(CartService);
  private cartSidebar = inject(CartSidebarService);
  private toast = inject(ToastService);
  private coinService = inject(CoinService);
  private productService = inject(ProductService);

  @Input() userId: string | undefined;

  // Search
  searchQuery: string = '';
  @ViewChild('searchInput') searchInput!: ElementRef;

  @ViewChild('ordersStickySentinel', { read: ElementRef }) ordersStickySentinelRef?: ElementRef<HTMLElement>;

  /** Lớp nền che khi đã cuộn (sentinel không còn giao viewport dưới header site). */
  stickyOrdersBackdrop = false;

  private ordersStickyIntersectionObserver?: IntersectionObserver;
  private resizeOrdersBackdropListener?: () => void;
  private resizeOrdersBackdropTimer?: ReturnType<typeof setTimeout>;

  // Order Detail Modal
  @ViewChild(OrderDetailAcc) orderDetailModal!: OrderDetailAcc;

  // Popup nhận xu từ đơn hàng (y chang luồng remind)
  @ViewChild('orderClaimBurstBtn') orderClaimBurstBtn!: ElementRef<HTMLButtonElement>;
  @ViewChild('reviewClaimBurstBtn') reviewClaimBurstBtn!: ElementRef<HTMLButtonElement>;

  showOrderCoinClaimPopup = false;
  orderCoinClaimAmount = 0;
  orderCoinClaimOrderCode = '';
  orderCoinClaimInProgress = false;

  // Popup nhận xu sau khi gửi đánh giá
  showReviewCoinClaimPopup = false;
  reviewCoinClaimAmount = 200;
  reviewCoinClaimOrderCode = '';
  reviewCoinClaimInProgress = false;

  showOrderFlyingCoin = false;
  flyStartX = 0;
  flyStartY = 0;
  flyOffsetPath = "path('M 0 0 Q 0 0 0 0')";

  private pendingCoinRewardOrder: Order | null = null;
  private pendingReviewRewardOrder: Order | null = null;

  private orderCoinClaimKey(order: Order): string {
    return `vc_order_received_claimed_${order.orderNumber}`;
  }

  private reviewCoinClaimKey(order: Order): string {
    return `vc_review_reward_claimed_${order.orderNumber}`;
  }

  private resolveRewardUserId(): string {
    const fromAuth = String(this.authService.currentUser()?.user_id || '').trim();
    if (fromAuth && fromAuth !== 'guest') return fromAuth;
    const fromInput = String(this.userId || '').trim();
    if (fromInput && fromInput !== 'guest') return fromInput;
    const fromOrderService = String(this.orderService.getCustomerID() || '').trim();
    if (fromOrderService && fromOrderService !== 'guest') return fromOrderService;
    return '';
  }

  isOrderCoinsClaimed(order: Order): boolean {
    try {
      return localStorage.getItem(this.orderCoinClaimKey(order)) === '1';
    } catch {
      return false;
    }
  }

  private setOrderCoinsClaimed(order: Order): void {
    try {
      localStorage.setItem(this.orderCoinClaimKey(order), '1');
    } catch {
      // ignore
    }
  }

  private isReviewCoinsClaimed(order: Order): boolean {
    try {
      return localStorage.getItem(this.reviewCoinClaimKey(order)) === '1';
    } catch {
      return false;
    }
  }

  private setReviewCoinsClaimed(order: Order): void {
    try {
      localStorage.setItem(this.reviewCoinClaimKey(order), '1');
    } catch {
      // ignore
    }
  }

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

  // Keep current order for building review payloads
  private orderForReview: Order | null = null;

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

  ngAfterViewInit(): void {
    queueMicrotask(() => {
      this.setupOrdersStickyBackdropObserver();
      this.resizeOrdersBackdropListener = () => {
        if (this.resizeOrdersBackdropTimer) clearTimeout(this.resizeOrdersBackdropTimer);
        this.resizeOrdersBackdropTimer = setTimeout(() => this.setupOrdersStickyBackdropObserver(), 180);
      };
      window.addEventListener('resize', this.resizeOrdersBackdropListener, { passive: true });
    });
  }

  ngOnDestroy(): void {
    if (this.resizeOrdersBackdropListener) {
      window.removeEventListener('resize', this.resizeOrdersBackdropListener);
      this.resizeOrdersBackdropListener = undefined;
    }
    if (this.resizeOrdersBackdropTimer) {
      clearTimeout(this.resizeOrdersBackdropTimer);
      this.resizeOrdersBackdropTimer = undefined;
    }
    this.ordersStickyIntersectionObserver?.disconnect();
    this.ordersStickyIntersectionObserver = undefined;
  }

  /** Giống Thông báo: sentinel trước khối neo — khi không còn intersect → bật khung giả. */
  private setupOrdersStickyBackdropObserver(): void {
    const el = this.ordersStickySentinelRef?.nativeElement;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const accountHost = el.closest('app-account');
    const raw = accountHost
      ? getComputedStyle(accountHost).getPropertyValue('--vc-account-sidebar-sticky-top').trim()
      : '';
    const parsed = parseInt(raw.replace('px', ''), 10);
    const insetPx = Number.isFinite(parsed) && parsed > 0 ? parsed : 164;

    this.ordersStickyIntersectionObserver?.disconnect();
    this.ordersStickyIntersectionObserver = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        this.stickyOrdersBackdrop = !e?.isIntersecting;
        this.cdr.markForCheck();
      },
      { root: null, rootMargin: `-${insetPx}px 0px 0px 0px`, threshold: 0 },
    );
    this.ordersStickyIntersectionObserver.observe(el);
  }

  fetchOrders(userId: string): void {
    this.isLoading = true;
    this.orderService.getOrders(userId).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.orders = res.items.map((backendOrder: BackendOrder) =>
            this.mapBackendOrder(backendOrder),
          );
          this.updateTabCounts();
          const orderId = this.route.snapshot.queryParams['orderId'];
          if (orderId && this.orderDetailModal && this.orders.length > 0) {
            setTimeout(() => {
              this.orderDetailModal.openModal(this.orders, orderId);
              this.router.navigate([], {
                relativeTo: this.route,
                queryParams: { menu: 'orders' },
                queryParamsHandling: 'merge',
                replaceUrl: true,
              });
            }, 50);
          }
        }
        this.isLoading = false;
        this.cdr.detectChanges(); // Manually trigger change detection
      },
      error: (err) => {
        console.error('OrdersComponent: Failed to fetch orders', err);
        this.isLoading = false;
        this.cdr.detectChanges(); // Manually trigger change detection
      },
    });
  }

  private mapBackendOrder(backendOrder: BackendOrder): Order {
    // Determine order date (use pending date or fallback to current)
    const orderDate = backendOrder.route?.pending || new Date().toISOString();

    // Map products
    const products: OrderProduct[] = (backendOrder.item || []).map((item: any, index) => {
      // Ưu tiên productId (được lưu trong đơn) hoặc _id để điều hướng chi tiết sản phẩm
      const rawPid = item?.productId || item?._id;
      let productId = '';
      if (rawPid) {
        if (typeof rawPid === 'string') productId = rawPid;
        else if (rawPid.$oid) productId = rawPid.$oid;
        else if (typeof rawPid.toString === 'function') productId = rawPid.toString();
      }
      // Backup: nếu đơn cũ chưa có _id, dùng sku làm id để backend có thể map ngược lại
      if (!productId && item?.sku) {
        productId = item.sku;
      }

      return {
        id: productId,
        name: item.productName,
        image: item.image, // Use the image URL from backend
        price: item.price,
        quantity: item.quantity,
        unit: item.unit,
        totalPrice: item.price * item.quantity,
        category: '', // Not available in orders.json
        gifted: false, // Default false
        sku: item.sku,
      };
    });

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

    // Tự động tính toán các trường bị thiếu đối với đơn cũ
    let subtotal = backendOrder.subtotal;
    let directDiscount = backendOrder.directDiscount || 0;
    let voucherDiscount = backendOrder.voucherDiscount || 0;
    let shippingFee = backendOrder.shippingFee !== undefined ? backendOrder.shippingFee : 30000;

    // Nếu đơn cũ chưa lưu subtotal, tự tính từ tổng giá trị sản phẩm
    if (!subtotal || subtotal === 0) {
      subtotal = products.reduce((acc, p) => acc + p.price * p.quantity, 0);
      // Ước tính discount dựa trên tổng tiền
      const calculatedDiscount = subtotal + shippingFee - backendOrder.totalAmount;
      if (calculatedDiscount > 0) {
        directDiscount = calculatedDiscount;
      }
    }

    return {
      id: backendOrder._id || backendOrder.order_id,
      orderNumber: backendOrder.order_id,
      orderDate: orderDate,
      status: status,
      totalAmount: backendOrder.totalAmount,
      subtotal,
      directDiscount,
      voucherDiscount,
      shippingFee,
      products: products,
      isReviewed: status === 'reviewed', // Đồng bộ với trạng thái backend
      isReturned: false, // Default
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
        // Tab "Đã giao hàng" chỉ hiển thị đơn 'delivered'.
        // Các đơn 'unreview'/'reviewed' sẽ hiển thị ở Quản lý đánh giá.
        filtered = filtered.filter((o) => o.status === 'delivered' || o.status === 'completed');
      } else {
        filtered = filtered.filter((o) => o.status === this.activeTab);
      }
    }

    // Filter by Search Query
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(query) ||
          o.products.some((p) => p.name.toLowerCase().includes(query)),
      );
    }

    // Sort by date (newest first) seems already sorted by backend, but redundant sort is safe
    return filtered.sort(
      (a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime(),
    );
  }

  // --- Tabs ---
  updateTabCounts(): void {
    const allOrders = this.orders;
    this.tabs.forEach((tab) => {
      if (tab.id === 'all') {
        tab.count = allOrders.length;
      } else if (tab.id === 'delivered') {
        // Số hiển thị trên tab "Đã giao hàng" chỉ đếm các đơn có status = 'delivered'
        tab.count = allOrders.filter((o) => o.status === 'delivered').length;
      } else {
        tab.count = allOrders.filter((o) => o.status === tab.id).length;
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
    const s = (order.status || '').toLowerCase().trim();
    switch (s) {
      case 'pending':
        return 'Chờ xác nhận';
      case 'confirmed':
        return 'Đã xác nhận';
      case 'shipping':
        return 'Đang giao hàng';
      case 'delivered':
        return 'Đã giao hàng';
      case 'received':
        return 'Đã nhận hàng';
      case 'unreview':
        return 'Chưa đánh giá';
      case 'reviewed':
        return 'Đã đánh giá';
      case 'completed':
        return 'Hoàn thành';
      case 'cancelled':
        return 'Đã hủy';
      case 'processing_return':
        return 'Yêu cầu trả hàng';
      case 'returning':
        return 'Đang hoàn trả';
      case 'returned':
        return 'Đã hoàn trả';
      case 'refund_rejected':
        return 'Từ chối hoàn tiền';
      default:
        return order.status || '';
    }
  }

  getDisplayStatusClass(order: Order): string {
    return `order-status-card status-${order.status}`;
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
    const mainProducts = order.products.filter((p) => !p.gifted);
    if (this.isOrderExpanded(order)) {
      return mainProducts;
    }
    return mainProducts.slice(0, 1);
  }

  hasGiftedProduct(product: OrderProduct, order: Order): boolean {
    return order.products.some((p) => p.gifted && p.parentId === product.id);
  }

  getGiftedProduct(product: OrderProduct, order: Order): OrderProduct | undefined {
    return order.products.find((p) => p.gifted && p.parentId === product.id);
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
        // Reload lại trang sau khi gửi yêu cầu trả hàng
        window.location.reload();
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
        top: rect.bottom, // Use rect directly for position: fixed
        left: rect.left,
        width: rect.width,
      };
    }
  }

  selectReason(value: string, event: Event): void {
    event.stopPropagation();
    this.selectedReason = value;
    this.showReasonDropdown = false;
  }

  getReasonLabel(value: string): string {
    const reason = this.returnReasonOptions.find((r) => r.value === value);
    return reason ? reason.label : '';
  }

  getModalDisplayProducts(): OrderProduct[] {
    if (!this.selectedOrder) return [];
    const mainProducts = this.selectedOrder.products.filter((p) => !p.gifted);
    if (this.isModalExpanded) return mainProducts;
    return mainProducts.slice(0, 2);
  }

  hasMoreModalProducts(): boolean {
    if (!this.selectedOrder) return false;
    return this.selectedOrder.products.filter((p) => !p.gifted).length > 2;
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
    const reason =
      this.selectedCancelReason === 'other'
        ? this.cancelDetailedReason
        : this.getCancelReasonLabel(this.selectedCancelReason);

    // Gửi orderNumber (order_id trên MongoDB) để backend tìm đúng đơn
    this.orderService.cancelOrder(order.orderNumber, reason).subscribe({
      next: () => {
        order.status = 'cancelled';
        this.updateTabCounts();
        this.closeCancelOrderModal();
        this.showSuccessModal = true;
        this.cdr.detectChanges();
        // Reload lại trang để đồng bộ toàn bộ danh sách đơn hàng
        window.location.reload();
      },
      error: (err) => {
        console.error('Cancel order API error:', err);
        this.closeCancelOrderModal();
        this.cdr.detectChanges();
        this.toast.showError(
          'Hủy đơn hàng không thành công. Vui lòng thử lại sau hoặc kiểm tra lại trạng thái đơn.',
        );
      },
    });
  }

  toggleCancelReasonDropdown(event: Event): void {
    event.stopPropagation();
    this.showCancelReasonDropdown = !this.showCancelReasonDropdown;
    if (this.showCancelReasonDropdown && this.cancelReasonDropdownButton) {
      const rect = this.cancelReasonDropdownButton.nativeElement.getBoundingClientRect();
      this.cancelReasonDropdownPosition = {
        top: rect.bottom, // Use rect directly for position: fixed
        left: rect.left,
        width: rect.width,
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
    const reason = this.cancelReasonOptions.find((r) => r.value === value);
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
        const rewardXU = this.getReceivedRewardXU(order);

        // Luồng UI: hiện popup chúc mừng 1 lần trước khi chuyển trạng thái đơn.
        if (rewardXU > 0 && !this.isOrderCoinsClaimed(order)) {
          this.pendingCoinRewardOrder = order;
          this.orderCoinClaimAmount = rewardXU;
          this.orderCoinClaimOrderCode = order.orderNumber;
          this.showOrderCoinClaimPopup = true;

          this.closeConfirmReceivedModal();
          this.cdr.detectChanges();
          return;
        }

        // Không thưởng hoặc đã claim rồi: cập nhật ngay
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

  // +1% giá trị đơn hàng khi user xác nhận đã nhận hàng
  getReceivedRewardXU(order: Order | null): number {
    const total = Number(order?.totalAmount ?? 0);
    if (!Number.isFinite(total) || total <= 0) return 0;
    return Math.floor(total * 0.01);
  }

  private closeOrderCoinClaimPopup(): void {
    this.showOrderCoinClaimPopup = false;
  }

  private closeReviewCoinClaimPopup(): void {
    this.showReviewCoinClaimPopup = false;
  }

  async claimOrderCoins(): Promise<void> {
    if (!this.pendingCoinRewardOrder) return;
    if (this.orderCoinClaimInProgress) return;

    const order = this.pendingCoinRewardOrder;
    const rewardXU = this.getReceivedRewardXU(order);
    if (rewardXU <= 0) {
      this.closeOrderCoinClaimPopup();
      this.pendingCoinRewardOrder = null;
      return;
    }

    if (this.isOrderCoinsClaimed(order)) {
      // Nếu đã claim trước đó (local), chỉ chuyển trạng thái đơn
      order.status = 'unreview';
      this.updateTabCounts();
      this.pendingCoinRewardOrder = null;
      this.closeOrderCoinClaimPopup();
      return;
    }

    this.orderCoinClaimInProgress = true;

    const uid = this.resolveRewardUserId();
    if (!uid || uid === 'guest') {
      this.orderCoinClaimInProgress = false;
      this.toast.showError('Không xác định được tài khoản để cộng xu.');
      return;
    }

    try {
      await this.coinService.applyOrderReward(order.orderNumber, rewardXU, uid);
    } catch (e) {
      this.orderCoinClaimInProgress = false;
      this.toast.showError('Cộng xu thất bại, vui lòng thử lại.');
      return;
    }

    this.setOrderCoinsClaimed(order);

    // Chuẩn bị đường bay dựa vào nút vừa bấm
    this.prepareFlyingCoinTargetFromClaimBtn();
    // Sau khi có toạ độ, mới tắt popup để không mất vị trí nút claim
    this.closeOrderCoinClaimPopup();
    this.showOrderFlyingCoin = true;
    // Đảm bảo overlay bay được render ngay lập tức (không phải chờ đến setTimeout)
    this.cdr.detectChanges();

    setTimeout(() => {
      this.showOrderFlyingCoin = false;
      this.orderCoinClaimInProgress = false;

      // Sau khi animation xong mới chuyển trạng thái để chip có thời gian đổi xám
      if (this.pendingCoinRewardOrder) {
        this.pendingCoinRewardOrder.status = 'unreview';
        this.updateTabCounts();
      }
      this.pendingCoinRewardOrder = null;
      this.cdr.detectChanges();
    }, 2000);
  }

  private prepareFlyingCoinTargetFromClaimBtn(btnEl?: HTMLElement | null): void {
    // Bay theo offset-path giống remind.ts
    const btn = btnEl || this.orderClaimBurstBtn?.nativeElement;
    if (!btn || typeof window === 'undefined') return;

    const COIN_SIZE = 80;
    const HALF = COIN_SIZE / 2;
    const w = window.innerWidth;
    const h = window.innerHeight;

    const claimRect = btn.getBoundingClientRect();

    const coinContainer = document.querySelector('.coin-bag-container') as HTMLElement | null;
    // Lấy theo toàn bộ container cho chuẩn "rơi vào giỏ" (icon + badge nằm trong đó)
    const coinRect = coinContainer?.getBoundingClientRect?.();

    const startX = claimRect.left + claimRect.width / 2 - HALF;
    const startY = claimRect.top + claimRect.height / 2 - HALF;

    const endX = coinRect ? coinRect.left + coinRect.width / 2 - HALF : w - 17 - HALF;
    const endY = coinRect ? coinRect.top + coinRect.height / 2 - HALF : h - 260;

    const dx = endX - startX;
    const dy = endY - startY;
    const peakY = Math.min(startY, endY) - 160;
    const ctrlX = startX + dx / 2;
    const ctrlY = peakY;

    const ctrlRelX = ctrlX - startX;
    const ctrlRelY = ctrlY - startY;

    this.flyStartX = startX;
    this.flyStartY = startY;
    this.flyOffsetPath = `path('M 0 0 Q ${ctrlRelX} ${ctrlRelY} ${dx} ${dy}')`;
  }

  async claimReviewCoins(): Promise<void> {
    if (!this.pendingReviewRewardOrder) return;
    if (this.reviewCoinClaimInProgress) return;

    const order = this.pendingReviewRewardOrder;
    const rewardXU = this.reviewCoinClaimAmount;
    if (rewardXU <= 0) {
      this.closeReviewCoinClaimPopup();
      this.pendingReviewRewardOrder = null;
      return;
    }

    if (this.isReviewCoinsClaimed(order)) {
      this.pendingReviewRewardOrder = null;
      this.closeReviewCoinClaimPopup();
      return;
    }

    this.reviewCoinClaimInProgress = true;
    const uid = this.resolveRewardUserId();
    if (!uid || uid === 'guest') {
      this.reviewCoinClaimInProgress = false;
      this.toast.showError('Không xác định được tài khoản để cộng xu.');
      return;
    }

    try {
      await this.coinService.applyReviewReward(order.orderNumber, rewardXU, uid);
    } catch (e: any) {
      this.reviewCoinClaimInProgress = false;
      const status = Number(e?.status || e?.error?.status || 0);
      if (status === 404) {
        this.toast.showError('Backend chưa cập nhật API thưởng xu đánh giá. Vui lòng khởi động lại server backend.');
      } else {
        this.toast.showError(e?.error?.message || e?.message || 'Cộng xu thất bại, vui lòng thử lại.');
      }
      return;
    }

    this.setReviewCoinsClaimed(order);
    this.prepareFlyingCoinTargetFromClaimBtn(this.reviewClaimBurstBtn?.nativeElement || null);
    this.closeReviewCoinClaimPopup();
    this.showOrderFlyingCoin = true;
    this.cdr.detectChanges();

    setTimeout(() => {
      this.showOrderFlyingCoin = false;
      this.reviewCoinClaimInProgress = false;
      this.pendingReviewRewardOrder = null;
      this.cdr.detectChanges();
    }, 2000);
  }

  // --- Other Actions ---
  onRepurchaseOrder(order: Order): void {
    // Chuẩn hóa sản phẩm của đơn sang CartItem (chỉ lấy sản phẩm mua, bỏ quà tặng)
    const purchasedProducts = this.getDisplayProducts(order);
    if (!purchasedProducts.length) return;

    const skus = new Set<string>();
    const ids = new Set<string>();

    const repurchaseItems: Array<Partial<CartItem> & { quantity: number }> = purchasedProducts.map(
      (p) => {
        const payload: Partial<CartItem> & { quantity: number } = {
          _id: p.id || p.sku || '',
          sku: p.sku || '',
          productName: p.name,
          price: p.price || 0,
          discount: 0,
          image: p.image || '',
          unit: p.unit || 'Hộp',
          category: p.category || '',
          hasPromotion: false,
          quantity: p.quantity || 1,
        };
        if (payload.sku) skus.add(payload.sku);
        if (payload._id) ids.add(String(payload._id));
        return payload;
      },
    );

    // Ghi đè số lượng trong giỏ theo đúng số lượng của đơn mua lại
    this.cartService.setItemsForRepurchase(repurchaseItems);

    // Lưu cấu hình chọn sẵn (sku/id) để Cart biết chỉ select các sản phẩm vừa thêm
    localStorage.setItem(
      'repurchase_selection',
      JSON.stringify({
        skus: Array.from(skus),
        ids: Array.from(ids),
      }),
    );

    // Mở sidebar giỏ hàng để user thấy các sản phẩm đã được chọn sẵn
    this.cartSidebar.openSidebar();
  }

  onRate(order: Order): void {
    // Mở popup đánh giá ngay tại trang Đơn hàng của tôi (không chuyển trang)
    this.orderForReview = order;
    const purchasedProducts = order.products.filter((p) => !p.gifted);
    this.reviewProducts = purchasedProducts.map((p) => {
      const productSku = p.sku || p.id;
      return {
        id: `${order.orderNumber}_${p.id || productSku}`,
        productName: p.name,
        productImage: p.image,
        category: p.category || '',
        sku: productSku,
        rating: 0,
        reviewText: '',
        images: [],
      } as ReviewProduct;
    });
    this.showReviewModal = true;
    this.cdr.detectChanges();
  }

  onViewReviewed(order: Order): void {
    // Mở trang chi tiết sản phẩm vừa đánh giá và tự trượt xuống phần Đánh giá.
    const purchased = (order.products || []).filter((p) => !p.gifted);
    const target = purchased[0];
    const targetSkuOrId = String(target?.sku || target?.id || '').trim();

    if (!targetSkuOrId) {
      this.toast.showError('Không tìm thấy sản phẩm để mở lại đánh giá.');
      return;
    }

    this.router.navigate(['/product', targetSkuOrId], {
      queryParams: {
        scrollTo: 'reviews',
        orderId: order.orderNumber,
      },
    });
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
    if (this.selectedOrder) {
      this.orderService.cancelReturnRequest(this.selectedOrder.orderNumber).subscribe({
        next: (res) => {
          if (res.success) {
            // Cập nhật trạng thái local
            if (this.selectedOrder) {
              this.selectedOrder.status = 'unreview';
              this.updateTabCounts();
              this.cdr.detectChanges();
              // Reload lại trang sau khi hủy yêu cầu trả hàng
              window.location.reload();
            }
          }
        },
        error: (err) => {
          console.error('Cancel return error:', err);
          // Fallback local update
          if (this.selectedOrder) {
            this.selectedOrder.status = 'unreview';
            this.updateTabCounts();
            this.cdr.detectChanges();
          }
        },
      });
    }
    this.showReturnModal = false;
    this.showCancelModal = false;
  }

  closeReviewModal() {
    this.showReviewModal = false;
    this.reviewProducts = [];
  }

  async submitReview(reviewedProducts: ReviewProduct[]): Promise<void> {
    const order = this.orderForReview || this.selectedOrder;
    if (!order) return;

    const customerID = String(this.userId || this.orderService.getCustomerID() || '').trim();
    if (!customerID || customerID === 'guest') {
      this.toast.showError('Không xác định được tài khoản để gửi đánh giá.');
      return;
    }

    const user = this.authService.currentUser() as any;
    const fullname = user?.full_name || user?.phone || 'Khách';
    const avatar = user?.avatar || '';

    try {
      const submittedSkus: string[] = [];
      const payloads = (reviewedProducts || []).map((rp) => {
        const sku = String(rp.sku || rp.id.split('_')[1] || rp.id);
        submittedSkus.push(sku);
        return this.productService.submitReview({
          sku,
          rating: rp.rating,
          content: rp.reviewText || '',
          fullname,
          customer_id: customerID,
          order_id: order.orderNumber,
          images: (rp.images || []).filter((img) => !!img),
          avatar,
        });
      });

      await Promise.all(payloads.map((obs: any) => firstValueFrom(obs)));

      // Update local UI state
      order.isReviewed = true;
      order.status = 'reviewed';
      this.updateTabCounts();
      this.toast.showSuccess('Đánh giá đã được gửi thành công!');

      // Hiện popup nhận 200 xu sau khi đánh giá (nếu chưa nhận)
      if (!this.isReviewCoinsClaimed(order)) {
        this.pendingReviewRewardOrder = order;
        this.reviewCoinClaimAmount = 200;
        this.reviewCoinClaimOrderCode = order.orderNumber;
        this.showReviewCoinClaimPopup = true;
      }

      // Notify product detail page to refresh reviews (for other tabs / already open page)
      const ts = String(Date.now());
      submittedSkus.forEach((sku) => {
        try {
          localStorage.setItem(`vc_review_submitted_${sku}`, ts);
        } catch {}
      });

      // Đồng bộ trạng thái qua trang "Quản lý đánh giá" ngay lập tức
      try {
        const reviewedRaw = localStorage.getItem('reviewedItems');
        const reviewedItems = reviewedRaw ? JSON.parse(reviewedRaw) : [];

        const now = new Date();
        const reviewDateStr =
          now.toLocaleDateString('vi-VN') +
          ' ' +
          now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

        (reviewedProducts || []).forEach((rp: any) => {
          const productId = String(rp.id || '').split('_')[1] || String(rp.sku || '');
          const reviewItemId = `${order.id}_${productId}`;
          const existingIndex = reviewedItems.findIndex((it: any) => String(it?.id || '') === reviewItemId);

          const sourceProduct =
            order.products.find((p) => String(p.id || '') === String(productId)) ||
            order.products.find((p) => String(p.sku || '') === String(rp.sku || ''));

          const nextItem = {
            id: reviewItemId,
            productName: rp.productName || sourceProduct?.name || '',
            productImage: rp.productImage || sourceProduct?.image || '',
            category: rp.category || sourceProduct?.category || '',
            reviewerName: fullname,
            rating: Number(rp.rating) || 0,
            reviewText: String(rp.reviewText || ''),
            reviewDate: reviewDateStr,
            orderId: order.id,
            orderNumber: order.orderNumber,
            images: (rp.images || []).filter((img: any) => !!img),
            sku: rp.sku || sourceProduct?.sku,
            productId: sourceProduct?.id || productId,
            products: order.products,
            OrderID: order.orderNumber,
            CustomerID: customerID,
            shippingInfo: { fullName: fullname },
          };

          if (existingIndex >= 0) reviewedItems[existingIndex] = nextItem;
          else reviewedItems.push(nextItem);
        });

        localStorage.setItem('reviewedItems', JSON.stringify(reviewedItems));
        localStorage.setItem('ordersDataChanged', String(Date.now()));
      } catch (syncErr) {
        console.warn('[Orders] sync reviewedItems localStorage failed:', syncErr);
      }
    } catch (e) {
      console.error('[Orders] submitReview error:', e);
      this.toast.showError('Gửi đánh giá thất bại, vui lòng thử lại.');
    } finally {
      this.orderForReview = null;
      this.closeReviewModal();
      this.cdr.detectChanges();
    }
  }
}
