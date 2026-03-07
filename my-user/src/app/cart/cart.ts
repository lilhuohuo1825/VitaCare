import {
  Component,
  inject,
  effect,
  ChangeDetectorRef,
  signal,
  computed,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { CartService, Cart as CartModel, CartItem } from '../services/cart.service';
import { CartSidebarService } from '../services/cart-sidebar.service';
import { AuthService } from '../services/auth.service';
import { ConsultationCartService } from '../services/consultation-cart.service';
import { ConfirmService } from '../services/confirm.service';
import { BuyNowService } from '../services/buy-now.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './cart.html',
  styleUrl: './cart.css',
})
export class Cart implements OnInit, OnDestroy {
  private cartService = inject(CartService);
  readonly cartSidebar = inject(CartSidebarService);
  private authService = inject(AuthService);
  private consultationCartService = inject(ConsultationCartService);
  private confirmService = inject(ConfirmService);
  private buyNowService = inject(BuyNowService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private cartUpdatedSub?: Subscription;

  cart = signal<CartModel | null>(null);
  cartSelectedIds = signal<Set<string>>(new Set());

  cartCount = computed(() => {
    const c = this.cart();
    return c?.items?.reduce((s, i) => s + (i.quantity || 0), 0) ?? 0;
  });

  cartTotalPrice = computed(() => {
    const c = this.cart();
    if (!c?.items?.length) return 0;
    let t = 0;
    c.items.forEach((i) => { t += (i.price || 0) * (i.quantity || 1); });
    return t;
  });

  isAllCartSelected = computed(() => {
    const items = this.cart()?.items ?? [];
    const ids = this.cartSelectedIds();
    return items.length > 0 && ids.size === items.length;
  });

  selectedCartItems = computed(() => {
    const c = this.cart();
    const ids = this.cartSelectedIds();
    if (!c?.items?.length) return [];
    return c.items.filter((i) => ids.has(i._id));
  });

  /** Số dòng sản phẩm đang được chọn (không tính theo quantity) */
  selectedItemCount = computed(() => {
    return this.selectedCartItems().length;
  });

  selectedCount = computed(() => {
    const items = this.selectedCartItems();
    return items.reduce((s, i) => s + (i.quantity || 1), 0);
  });

  selectedTotalPrice = computed(() => {
    const items = this.selectedCartItems();
    return items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
  });

  constructor() {
    effect(() => {
      const open = this.cartSidebar.isOpen();
      const user = this.authService.currentUser();
      if (open && user && (user as any).user_id) {
        this.loadCart((user as any).user_id as string);
      } else if (open && !user?.user_id) {
        this.loadGuestCart();
      } else if (!open) {
        this.cart.set(null);
        this.cartSelectedIds.set(new Set());
      }
    });
  }

  loadGuestCart(): void {
    const items = this.cartService.getGuestCartItems();
    const totalQty = items.reduce((s, i) => s + (i.quantity || 1), 0);
    const cart: CartModel = {
      user_id: 'guest',
      items,
      itemCount: items.length,
      totalQuantity: totalQty,
    };
    this.cart.set(cart);
    this.cartSelectedIds.set(new Set(items.map((i) => i._id)));
    this.cdr.markForCheck();
  }

  ngOnInit(): void {
    this.cartUpdatedSub = this.cartService.cartUpdated$.subscribe(updatedCart => {
      if (updatedCart && this.cartSidebar.isOpen()) {
        this.cart.set(updatedCart as CartModel);
        this.cartSelectedIds.set(new Set(updatedCart.items?.map((i: any) => i._id) ?? []));
        this.cdr.markForCheck();
      }
    });
  }

  ngOnDestroy(): void {
    this.cartUpdatedSub?.unsubscribe();
  }

  close(): void {
    this.cartSidebar.closeSidebar();
  }

  loadCart(userId: string): void {
    this.cartService.getCart(userId).subscribe((res) => {
      if (res.success && res.cart) {
        const c = res.cart;
        let tp = 0;
        if (c.items) {
          c.items.forEach((item) => {
            tp += (item.price || 0) * (item.quantity || 1);
          });
        }
        (c as any).totalPrice = tp;
        this.cart.set(c);
        this.cartSelectedIds.set(new Set(c.items?.map((i) => i._id) ?? []));
        this.cdr.markForCheck();
      }
    });
  }

  onSelectAllCart(checked: boolean): void {
    const c = this.cart();
    if (checked && c?.items?.length) {
      this.cartSelectedIds.set(new Set(c.items.map((i) => i._id)));
    } else {
      this.cartSelectedIds.set(new Set());
    }
    this.cdr.markForCheck();
  }

  isItemSelected(item: CartItem): boolean {
    return this.cartSelectedIds().has(item._id);
  }

  onItemCheck(item: CartItem, checked: boolean): void {
    const ids = new Set(this.cartSelectedIds());
    if (checked) ids.add(item._id);
    else ids.delete(item._id);
    this.cartSelectedIds.set(ids);
    this.cdr.markForCheck();
  }

  cartQtyChange(item: CartItem, delta: number): void {
    if ((item.quantity || 1) === 1 && delta === -1) {
      this.confirmRemoveCartItem(item);
      return;
    }
    const user = this.authService.currentUser();
    const c = this.cart();
    if (!c?.items) return;
    const itemId = String((item as any)._id ?? item._id);
    const newQty = Math.max(1, (item.quantity || 1) + delta);
    const nextItems = c.items.map((i) => {
      const id = String((i as any)._id ?? i._id);
      return id === itemId ? { ...i, quantity: newQty } : { ...i };
    });
    let tp = 0;
    nextItems.forEach((i) => { tp += (i.price || 0) * (i.quantity || 1); });
    this.cart.set({ ...c, items: nextItems, totalPrice: tp } as CartModel);
    this.cdr.markForCheck();

    if (user?.user_id) {
      const items = nextItems.map((i) => ({ ...i, _id: String((i as any)._id ?? i._id) }));
      this.cartService.updateCart(user.user_id, items).subscribe({
        next: (res) => {
          if (res.success && res.cart) {
            const updated = res.cart;
            let t = 0;
            updated.items?.forEach((i) => { t += (i.price || 0) * (i.quantity || 1); });
            (updated as any).totalPrice = t;
            this.cart.set(updated);
          }
          this.cdr.markForCheck();
        },
        error: () => this.cdr.markForCheck(),
      });
    } else {
      this.cartService.updateGuestCart(nextItems);
      this.cdr.markForCheck();
    }
  }

  confirmRemoveCartItem(item: CartItem): void {
    this.confirmService.open('Xác nhận xoá sản phẩm này?', () => this.cartRemoveItem(item));
  }

  cartRemoveItem(item: CartItem): void {
    const user = this.authService.currentUser();
    const c = this.cart();
    if (!c?.items) return;
    const itemId = String((item as any)._id ?? item._id);
    const items = c.items.filter((i) => String((i as any)._id ?? i._id) !== itemId);
    const ids = new Set(this.cartSelectedIds());
    ids.delete(itemId);

    if (user?.user_id) {
      this.cartService.updateCart(user.user_id, items).subscribe({
        next: (res) => {
          if (res.success && res.cart) {
            const updated = res.cart;
            let t = 0;
            updated.items?.forEach((i) => { t += (i.price || 0) * (i.quantity || 1); });
            (updated as any).totalPrice = t;
            this.cart.set(updated);
            this.cartSelectedIds.set(ids);
          }
          this.cdr.markForCheck();
        },
        error: () => this.cdr.markForCheck(),
      });
    } else {
      this.cartService.updateGuestCart(items);
      this.cart.set({ ...c, items, itemCount: items.length, totalQuantity: items.reduce((s, i) => s + (i.quantity || 1), 0) } as CartModel);
      this.cartSelectedIds.set(ids);
      this.cdr.markForCheck();
    }
  }

  goToOrder(e: Event): void {
    e.preventDefault();
    const items = this.selectedCartItems();
    if (!items.length) {
      return;
    }
    this.buyNowService.setItemsFromCart(items);
    this.close();
    this.router.navigate(['/order']);
  }

  goToConsultation(e: Event): void {
    e.preventDefault();
    this.consultationCartService.setProductsFromCart(this.selectedCartItems());
    this.close();
    this.router.navigate(['/consultation']);
  }

  goToShopping(): void {
    this.close();
    this.router.navigate(['/products']);
  }
}
