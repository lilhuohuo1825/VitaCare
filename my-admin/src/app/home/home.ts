import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { OrderService } from '../services/order.service';
import { CustomerService } from '../services/customer.service';
import { ProductService } from '../services/product.service';
import { CommonModule, DecimalPipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { Router } from '@angular/router';

declare var Chart: any;

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  providers: [DecimalPipe],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  // Chart refs (Top/Main)
  @ViewChild('revenueChart') revenueChartRef!: ElementRef;
  @ViewChild('ordersVolumeChart') ordersVolumeChartRef!: ElementRef;
  @ViewChild('promoDistributionChart') promoDistributionChartRef!: ElementRef;
  @ViewChild('statusPieChart') statusPieChartRef!: ElementRef;
  @ViewChild('customerBarChart') customerBarChartRef!: ElementRef;

  // New Chart refs
  @ViewChild('paymentMethodChart') paymentMethodChartRef!: ElementRef;
  @ViewChild('customerTierChart') customerTierChartRef!: ElementRef;
  @ViewChild('peakHoursChart') peakHoursChartRef!: ElementRef;

  stats: any = {};
  isLoading = true;

  totalRevenue = 0;
  totalOrdersCount = 0;
  totalCustomersCount = 0;
  totalProductsCount = 0;

  recentOrders: any[] = [];
  topProducts: any[] = [];
  outOfStockProducts: any[] = [];

  constructor(
    private authService: AuthService,
    private orderService: OrderService,
    private customerService: CustomerService,
    private productService: ProductService,
    private cdr: ChangeDetectorRef,
    private decimalPipe: DecimalPipe,
    private router: Router
  ) { }

  ngOnInit() {
    this.loadData();

    // Set default Chart.js font to Inter from variables.css
    if (typeof Chart !== 'undefined') {
      Chart.defaults.font.family = "'Inter', -apple-system, sans-serif";
      Chart.defaults.color = "#616161";
    }
  }

  printDashboard() {
    window.print();
  }

  loadData() {
    this.isLoading = true;
    forkJoin({
      stats: this.authService.getStats(),
      orders: this.orderService.getOrders(),
      customers: this.customerService.getCustomers(),
      products: this.productService.getProducts()
    }).subscribe({
      next: (results: any) => {
        this.stats = results.stats.data || results.stats;
        const orders = results.orders.data || results.orders;
        const customers = results.customers.data || results.customers;
        const products = results.products.data || results.products;

        this.processMetrics(orders, customers, products);
        this.isLoading = false;

        this.cdr.detectChanges();
        // Slightly longer delay for high-quality rendering
        setTimeout(() => this.initCharts(orders, customers), 300);
      },
      error: (err) => {
        console.error('Error loading dashboard data:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  processMetrics(orders: any[], customers: any[], products: any[]) {
    this.totalOrdersCount = orders.length;
    this.totalCustomersCount = customers.length;
    this.totalProductsCount = products.length;

    this.totalRevenue = orders
      .filter(o => o.statusPayment === 'paid' || o.status === 'delivered')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    this.recentOrders = [...orders].sort((a, b) => {
      const da = new Date(a.createdAt || a.route?.pending || Date.now()).getTime();
      const db = new Date(b.createdAt || b.route?.pending || Date.now()).getTime();
      return db - da;
    }).slice(0, 8);

    const salesMap: { [key: string]: number } = {};
    orders.forEach(o => {
      (o.item || o.items || []).forEach((it: any) => {
        const id = it.sku || it.productId || 'unknown';
        salesMap[id] = (salesMap[id] || 0) + (it.quantity || 1);
      });
    });

    this.topProducts = Object.keys(salesMap)
      .map(id => {
        const p = products.find(prod => prod.sku === id || prod._id === id);
        return {
          id,
          name: p ? p.name : 'Sản phẩm ' + id,
          sales: salesMap[id],
          image: p ? (Array.isArray(p.image) ? p.image[0] : (p.image || '')) : ''
        };
      })
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 3);

    this.outOfStockProducts = products
      .filter(p => (p.stock !== undefined && p.stock <= 5))
      .sort((a, b) => (a.stock || 0) - (b.stock || 0))
      .slice(0, 5);
  }

  initCharts(orders: any[], customers: any[]) {
    if (typeof Chart === 'undefined') return;

    this.renderRevenueChart(orders);
    this.renderOrdersVolumeChart(orders);
    this.renderPromoDistributionChart(orders);
    this.renderStatusPieChart(orders);
    this.renderCustomerBarChart(customers);

    // New Charts
    this.renderPaymentMethodChart(orders);
    this.renderCustomerTierChart(customers);
    this.renderPeakHoursChart(orders);
  }

  private renderRevenueChart(orders: any[]) {
    if (!this.revenueChartRef) return;
    const ctx = this.revenueChartRef.nativeElement.getContext('2d');

    const dailyRev: { [key: string]: number } = {};
    orders.forEach(o => {
      if (o.statusPayment === 'paid' || o.status === 'delivered') {
        const d = (o.createdAt || o.route?.pending || new Date().toISOString()).substring(0, 10);
        dailyRev[d] = (dailyRev[d] || 0) + (o.totalAmount || 0);
      }
    });

    const labels = Object.keys(dailyRev).sort().slice(-15);
    const data = labels.map(l => dailyRev[l]);

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels.map(l => l.split('-').reverse().slice(0, 2).join('/')),
        datasets: [{
          label: 'Doanh thu (đ)',
          data: data,
          borderColor: '#4A55A2',
          backgroundColor: 'rgba(74, 85, 162, 0.1)',
          fill: true,
          tension: 0.4,
          borderWidth: 3,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1E293B',
            padding: 12,
            titleFont: { size: 14, weight: 'bold' },
            bodyFont: { size: 13 },
            callbacks: {
              label: (ctx: any) => ` Doanh thu: ${ctx.raw.toLocaleString()}đ`
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.03)' },
            ticks: {
              font: { size: 11 },
              callback: (v: any) => v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' : v.toLocaleString()
            }
          }
        }
      }
    });
  }

  private renderOrdersVolumeChart(orders: any[]) {
    if (!this.ordersVolumeChartRef) return;
    const ctx = this.ordersVolumeChartRef.nativeElement.getContext('2d');
    const volume: { [key: string]: number } = {};
    orders.forEach(o => {
      const d = (o.createdAt || o.route?.pending || new Date().toISOString()).substring(0, 10);
      volume[d] = (volume[d] || 0) + 1;
    });
    const labels = Object.keys(volume).sort().slice(-10);
    const data = labels.map(l => volume[l]);

    new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data, borderColor: '#B620E0',
          backgroundColor: 'rgba(182, 32, 224, 0.05)',
          fill: true, tension: 0.4, pointRadius: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { display: false }, y: { display: false } }
      }
    });
  }

  private renderPromoDistributionChart(orders: any[]) {
    if (!this.promoDistributionChartRef) return;
    const ctx = this.promoDistributionChartRef.nativeElement.getContext('2d');
    const withPromo = orders.filter(o => o.promotion && (Array.isArray(o.promotion) ? o.promotion.length > 0 : !!o.promotion)).length;
    const defaultCnt = orders.length - withPromo;

    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Dùng Mã', 'Mặc định'],
        datasets: [{
          data: [withPromo, defaultCnt],
          backgroundColor: ['#4A55A2', '#EEF2FF'],
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: { cutout: '78%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, padding: 20 } } } }
    });
  }

  private renderStatusPieChart(orders: any[]) {
    if (!this.statusPieChartRef) return;
    const ctx = this.statusPieChartRef.nativeElement.getContext('2d');
    const delivered = orders.filter(o => o.status === 'delivered').length;
    const pending = orders.filter(o => o.status === 'pending').length;
    const other = orders.length - delivered - pending;

    new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Hoàn tất', 'Chờ xử lý', 'Khác'],
        datasets: [{
          data: [delivered, pending, other],
          backgroundColor: ['#4A55A2', '#F59E0B', '#B9A6DC'],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: { plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, padding: 15 } } } }
    });
  }

  private renderCustomerBarChart(customers: any[]) {
    if (!this.customerBarChartRef) return;
    const ctx = this.customerBarChartRef.nativeElement.getContext('2d');
    const days = [0, 0, 0, 0, 0, 0, 0];
    customers.forEach(u => {
      const d = u.registerdate || u.createdAt || Date.now();
      const day = new Date(d).getDay();
      days[day === 0 ? 6 : day - 1]++;
    });

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
        datasets: [{
          data: days,
          backgroundColor: '#4f46e5',
          borderRadius: 8,
          barThickness: 32,
          hoverBackgroundColor: '#3730a3'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.03)' }, ticks: { precision: 0 } }
        }
      }
    });
  }

  // --- New Visualizations ---

  private renderPaymentMethodChart(orders: any[]) {
    if (!this.paymentMethodChartRef) return;
    const ctx = this.paymentMethodChartRef.nativeElement.getContext('2d');

    const cod = orders.filter(o => o.paymentMethod?.toLowerCase() === 'cod').length;
    const online = orders.length - cod;

    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Tiền mặt (COD)', 'Chuyển khoản / Ví'],
        datasets: [{
          data: [cod, online],
          backgroundColor: ['#4A55A2', '#10B981'],
          borderWidth: 0,
          hoverOffset: 10
        }]
      },
      options: {
        cutout: '70%',
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, padding: 20 } }
        }
      }
    });
  }

  private renderCustomerTierChart(customers: any[]) {
    if (!this.customerTierChartRef) return;
    const ctx = this.customerTierChartRef.nativeElement.getContext('2d');

    const tiers: { [key: string]: number } = { 'Đồng': 0, 'Bạc': 0, 'Vàng': 0, 'Kim cương': 0 };
    customers.forEach(c => {
      const t = c.tiering || 'Đồng';
      tiers[t] = (tiers[t] || 0) + 1;
    });

    new Chart(ctx, {
      type: 'polarArea',
      data: {
        labels: Object.keys(tiers),
        datasets: [{
          data: Object.values(tiers),
          backgroundColor: [
            'rgba(148, 163, 184, 0.7)', // Silver-ish
            'rgba(74, 85, 162, 0.7)',  // Primary
            'rgba(245, 158, 11, 0.7)',  // Gold
            'rgba(182, 32, 224, 0.7)'   // Diamond-ish Purple
          ]
        }]
      },
      options: {
        scales: { r: { display: false } },
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12 } }
        }
      }
    });
  }

  private renderPeakHoursChart(orders: any[]) {
    if (!this.peakHoursChartRef) return;
    const ctx = this.peakHoursChartRef.nativeElement.getContext('2d');

    const hours = new Array(24).fill(0);
    orders.forEach(o => {
      const d = new Date(o.createdAt || o.route?.pending || Date.now());
      hours[d.getHours()]++;
    });

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: Array.from({ length: 24 }, (_, i) => i + 'h'),
        datasets: [{
          label: 'Số đơn hàng',
          data: hours,
          backgroundColor: 'rgba(74, 85, 162, 0.7)',
          borderRadius: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { font: { size: 9 }, autoSkip: true, maxRotation: 0 } },
          y: { display: false, beginAtZero: true }
        }
      }
    });
  }

  viewAllOrders() {
    this.router.navigate(['/admin/orders']);
  }

  viewAllProducts() {
    this.router.navigate(['/admin/products']);
  }

  goToImport(product: any) {
    // Navigate to products page with search term to show only this product for easy import
    this.router.navigate(['/admin/products'], { queryParams: { search: product.sku || product.name } });
  }

  viewOrderDetail(orderId: string) {
    this.router.navigate(['/admin/orders/detail', orderId]);
  }
}
