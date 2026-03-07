import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { CustomerService } from '../services/customer.service';

@Component({
  selector: 'app-customerdetail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './customerdetail.html',
  styleUrls: ['./customerdetail.css']
})
export class Customerdetail implements OnInit {
  customer: any;
  orders: any[] = [];
  isLoading = false;

  constructor(
    private route: ActivatedRoute,
    private customerService: CustomerService,
    private location: Location
  ) { }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadCustomerDetail(id);
    }
  }

  loadCustomerDetail(id: string) {
    this.isLoading = true;
    this.customerService.getCustomerById(id).subscribe({
      next: (res) => {
        try {
          if (res && res.success && res.data) {
            this.customer = res.data;
            this.loadCustomerOrders(id); // Use route param 'id' to be safe
          } else {
            console.error('Customer not found or success is false', res);
            this.customer = null;
            this.isLoading = false;
          }
        } catch (e) {
          console.error('Error processing customer data', e);
          this.isLoading = false;
        }
      },
      error: (err) => {
        console.error('getCustomerById error:', err);
        this.customer = null;
        this.isLoading = false;
      }
    });
  }

  loadCustomerOrders(id: string) {
    this.customerService.getCustomerOrders(id).subscribe({
      next: (res) => {
        try {
          if (res && res.success) {
            this.orders = res.data || [];
          } else {
            this.orders = [];
          }
          this.updateLastOrderDate();
        } catch (e) {
          console.error('Error processing orders', e);
        } finally {
          this.isLoading = false;
        }
      },
      error: (err) => {
        console.error('getCustomerOrders error:', err);
        this.orders = [];
        this.isLoading = false;
      }
    });
  }

  goBack() {
    this.location.back();
  }

  get addressList(): string[] {
    if (this.customer?.address && Array.isArray(this.customer.address)) {
      if (this.customer.address.length > 0) {
        // Assume array elements form one address
        return [this.customer.address.join(', ')];
      }
    }
    return ['Chưa cập nhật'];
  }

  get totalOrders(): number {
    return this.orders?.length || 0;
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
