import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { CustomerService } from '../services/customer.service';

@Component({
  selector: 'app-customerdetail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './customerdetail.html',
  styleUrls: ['./customerdetail.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Customerdetail implements OnInit {
  customer: any;
  orders: any[] = [];
  loadedAddresses: any[] = [];
  isLoading = false;
  isLoadingRelated = false;
  showAllOrders = false;

  cachedAddressList: string[] = ['Chưa cập nhật'];
  cachedTotalOrders: number = 0;

  constructor(
    private route: ActivatedRoute,
    private customerService: CustomerService,
    private location: Location,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadCustomerDetail(id);
    }
  }

  loadCustomerDetail(id: string) {
    this.isLoading = true;
    this.cdr.markForCheck();
    this.customerService.getCustomerProfile(id).subscribe({
      next: (res) => {
        try {
          if (res && res.success && res.data) {
            this.customer = res.data.customer;
            this.orders = Array.isArray(res.data.orders) ? res.data.orders : [];
            this.loadedAddresses = Array.isArray(res.data.addresses) ? res.data.addresses : [];
            this.updateLastOrderDate();
            this.updateCachedAddressList();
            this.cachedTotalOrders = this.orders?.length || 0;
          } else {
            console.error('Customer not found or success is false', res);
            this.customer = null;
          }
        } catch (e) {
          console.error('Error processing customer data', e);
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('getCustomerById error:', err);
        this.customer = null;
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  get displayedOrders(): any[] {
    return this.showAllOrders ? this.orders : this.orders.slice(0, 3);
  }

  getOrderDate(order: any): any {
    return order?.route?.pending || order?.created_at || order?.createdAt || null;
  }

  getOrderItems(order: any): any[] {
    return Array.isArray(order?.item) ? order.item : (Array.isArray(order?.items) ? order.items : []);
  }

  getOrderAddress(order: any): string {
    const addr = order?.delivery_address || order?.shipping_address || order?.address || {};
    if (typeof addr === 'string') return addr;
    if (Array.isArray(addr)) return addr.filter(Boolean).join(', ');
    return [addr?.detail || addr?.fullAddress, addr?.ward, addr?.district, addr?.province].filter(Boolean).join(', ');
  }

  toggleShowAllOrders() {
    this.showAllOrders = !this.showAllOrders;
    this.cdr.markForCheck();
  }

  goBack() {
    this.location.back();
  }

  private updateCachedAddressList() {
    if (this.loadedAddresses && this.loadedAddresses.length > 0) {
      this.cachedAddressList = this.loadedAddresses.map(a => {
        const parts = [a.fullAddress || a.detail, a.ward, a.district, a.province].filter(Boolean);
        return parts.join(', ') || a.name || 'Địa chỉ không rõ';
      });
      return;
    }
    if (this.customer?.address && Array.isArray(this.customer.address)) {
      if (this.customer.address.length > 0) {
        this.cachedAddressList = [this.customer.address.join(', ')];
        return;
      }
    }
    if (this.customer?.address && typeof this.customer.address === 'string') {
      this.cachedAddressList = [this.customer.address];
      return;
    }
    this.cachedAddressList = ['Chưa cập nhật'];
  }

  get addressList(): string[] {
    return this.cachedAddressList;
  }

  get totalOrders(): number {
    return this.cachedTotalOrders;
  }

  // Pre-calculated to prevent infinite change detection loops
  cachedLastOrderDate: Date | null = null;

  updateLastOrderDate() {
    if (this.orders && this.orders.length > 0) {
      const validOrders = this.orders.filter(o => o.route && o.route.pending);
      if (validOrders.length > 0) {
        const sorted = [...validOrders].sort((a, b) => {
          const timeA = new Date(a.route.pending).getTime();
          const timeB = new Date(b.route.pending).getTime();
          return timeB - timeA;
        });
        if (sorted[0] && sorted[0].route) {
          this.cachedLastOrderDate = new Date(sorted[0].route.pending);
          return;
        }
      }
    }
    this.cachedLastOrderDate = null;
  }
}
