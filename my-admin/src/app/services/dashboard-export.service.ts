import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';

export type ExportFormat = 'pdf' | 'xlsx' | 'csv';

export interface DashboardExportInput {
  stats: any;
  orders: any[];
  customers: any[];
  prescriptions: any[];
  promotions: any[];
  productConsultations: any[];
  diseaseConsultations: any[];
  totalProductsCount: number;
  totalOrdersCount: number;
  totalCustomersCount: number;
  totalRevenue: number;
  totalDoctorsCount: number;
  totalPharmacistsCount: number;
  totalAdminsCount: number;
  totalVisibleBlogsCount: number;
  totalVisibleDiseasePostsCount: number;
  topProducts: { name: string; sales: number }[];
  recentOrders: any[];
  outOfStockProducts: any[];
  totalOutOfStockCount: number;
  showingLowStockFallback: boolean;
  getOrderStatusText: (o: any) => string;
}

export interface DashboardExportSnapshot {
  generatedAt: string;
  summary: [string, string][];
  revenue30d: [string, number][];
  promotionStatus: [string, number][];
  prescriptionOrderStatus: [string, number][];
  orderStatus: [string, number][];
  prescriptionConsult: [string, number][];
  productConsult: [string, number][];
  diseaseConsult: [string, number][];
  memberTiers: [string, number][];
  hourlyActivity: [string, number, number][];
  topProducts: [string, number][];
  stockAlerts: [string, number][];
  stockNote: string;
  recentOrders: [string, string, string, string][];
}

@Injectable({ providedIn: 'root' })
export class DashboardExportService {
  buildSnapshot(input: DashboardExportInput): DashboardExportSnapshot {
    const generatedAt = new Date().toLocaleString('vi-VN');

    const summary: [string, string][] = [
      ['Sản phẩm (hiện có trong kho)', String(input.totalProductsCount)],
      ['Đơn hàng (tổng hệ thống)', String(input.totalOrdersCount)],
      ['Doanh thu thực thu (đã thanh toán)', `${input.totalRevenue.toLocaleString('vi-VN')}đ`],
      ['Khách hàng (thành viên đăng ký)', String(input.totalCustomersCount)],
      ['Số lượng bác sĩ', String(input.totalDoctorsCount)],
      ['Số lượng dược sĩ', String(input.totalPharmacistsCount)],
      ['Số lượng quản trị viên', String(input.totalAdminsCount)],
      ['Bài viết đang hiển thị', String(input.totalVisibleBlogsCount)],
      ['Bài viết bệnh đang hiển thị', String(input.totalVisibleDiseasePostsCount)]
    ];

    const revenue30d: [string, number][] = (input.stats?.revenue30d || []).map((r: any) => [
      String(r.date || ''),
      Number(r.revenue || 0)
    ]);

    const promotionStatus = this.aggregatePromotionStatus(input.promotions);
    const prescriptionOrderStatus = this.aggregatePrescriptionShortLabels(input.prescriptions);
    const orderStatus = this.aggregateOrderPie(input.orders);
    const prescriptionConsult = this.aggregatePrescriptionConsult(input.prescriptions);
    const productConsult = this.aggregateProductConsult(input.productConsultations);
    const diseaseConsult = this.aggregateDiseaseConsult(input.diseaseConsultations);
    const memberTiers = this.aggregateMemberTiers(input.customers);
    const hourlyActivity = this.aggregateHourlyActivity(input.orders, input.customers);
    const topProducts: [string, number][] = (input.topProducts || []).map((p) => [
      String(p.name || ''),
      Number(p.sales || 0)
    ]);
    const stockAlerts: [string, number][] = (input.outOfStockProducts || []).map((p: any) => [
      String(p.name || ''),
      Number(p.stock ?? 0)
    ]);
    const stockNote = input.showingLowStockFallback
      ? 'Ghi chú: Chưa có sản phẩm hết hàng (stock = 0); danh sách là sản phẩm sắp hết.'
      : `Tổng sản phẩm hết hàng (stock = 0): ${input.totalOutOfStockCount}`;

    const recentOrders: [string, string, string, string][] = (input.recentOrders || []).map((o) => [
      String(o.order_id || o.orderCode || o._id || o.id || '-'),
      String(o.shippingInfo?.fullName || 'Khách lẻ'),
      `${Number(o.totalAmount || 0).toLocaleString('vi-VN')}đ`,
      input.getOrderStatusText(o)
    ]);

    return {
      generatedAt,
      summary,
      revenue30d,
      promotionStatus,
      prescriptionOrderStatus,
      orderStatus,
      prescriptionConsult,
      productConsult,
      diseaseConsult,
      memberTiers,
      hourlyActivity,
      topProducts,
      stockAlerts,
      stockNote,
      recentOrders
    };
  }

  downloadXlsx(snapshot: DashboardExportSnapshot, filenameBase = 'tong-quan-vitacare'): void {
    const wb = XLSX.utils.book_new();
    const add = (name: string, rows: (string | number)[][]) => {
      const safe = name.substring(0, 31);
      const ws = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, safe);
    };

    add('Tom_tat', [['Chỉ số', 'Giá trị'], ...snapshot.summary]);
    add('Doanh_thu_30_ngay', [['Ngày', 'Doanh thu (đ)'], ...snapshot.revenue30d]);
    add('KM_trang_thai', [['Trạng thái', 'Số lượng'], ...snapshot.promotionStatus]);
    add('Don_thuoc', [['Trạng thái', 'Số lượng'], ...snapshot.prescriptionOrderStatus]);
    add('Don_hang', [['Trạng thái', 'Số lượng'], ...snapshot.orderStatus]);
    add('Tu_van_don_thuoc', [['Trạng thái', 'Số lượng'], ...snapshot.prescriptionConsult]);
    add('Tu_van_SP', [['Trạng thái', 'Số lượng'], ...snapshot.productConsult]);
    add('Tu_van_benh', [['Trạng thái', 'Số lượng'], ...snapshot.diseaseConsult]);
    add('Phan_hang_TV', [['Hạng', 'Số lượng'], ...snapshot.memberTiers]);
    add('Xu_huong_gio', [['Giờ', 'Đơn hàng', 'Đăng ký'], ...snapshot.hourlyActivity]);
    add('SP_ban_chay', [['Sản phẩm', 'Lượt bán'], ...snapshot.topProducts]);
    add('Canh_bao_ton', [['Sản phẩm', 'Tồn kho'], [snapshot.stockNote, ''], ...snapshot.stockAlerts]);
    add('Don_gan_nhat', [['Mã đơn', 'Khách hàng', 'Tổng đơn', 'Trạng thái'], ...snapshot.recentOrders]);

    XLSX.writeFile(wb, `${filenameBase}.xlsx`);
  }

  downloadCsv(snapshot: DashboardExportSnapshot, filenameBase = 'tong-quan-vitacare'): void {
    const blocks: string[][] = [];
    const pushSection = (title: string, header: string[], rows: (string | number)[][]) => {
      blocks.push([`=== ${title} ===`]);
      blocks.push(header);
      rows.forEach((r) => blocks.push(r.map(String)));
      blocks.push([]);
    };

    pushSection('TÓM TẮT', ['Chỉ số', 'Giá trị'], snapshot.summary);
    pushSection('DOANH THU 30 NGÀY', ['Ngày', 'Doanh thu'], snapshot.revenue30d);
    pushSection('TRẠNG THÁI KHUYẾN MÃI', ['Trạng thái', 'Số lượng'], snapshot.promotionStatus);
    pushSection('TRẠNG THÁI ĐƠN THUỐC', ['Trạng thái', 'Số lượng'], snapshot.prescriptionOrderStatus);
    pushSection('TRẠNG THÁI ĐƠN HÀNG', ['Trạng thái', 'Số lượng'], snapshot.orderStatus);
    pushSection('TƯ VẤN ĐƠN THUỐC', ['Trạng thái', 'Số lượng'], snapshot.prescriptionConsult);
    pushSection('TƯ VẤN SẢN PHẨM', ['Trạng thái', 'Số lượng'], snapshot.productConsult);
    pushSection('TƯ VẤN BỆNH', ['Trạng thái', 'Số lượng'], snapshot.diseaseConsult);
    pushSection('PHÂN HẠNG THÀNH VIÊN', ['Hạng', 'Số lượng'], snapshot.memberTiers);
    pushSection('XU HƯỚNG THEO GIỜ', ['Giờ', 'Đơn hàng', 'Đăng ký'], snapshot.hourlyActivity);
    pushSection('SẢN PHẨM BÁN CHẠY', ['Sản phẩm', 'Lượt bán'], snapshot.topProducts);
    pushSection('CẢNH BÁO TỒN KHO', ['Sản phẩm', 'Tồn kho'], [
      [snapshot.stockNote, ''],
      ...snapshot.stockAlerts
    ]);
    pushSection('ĐƠN HÀNG MỚI NHẤT', ['Mã đơn', 'Khách hàng', 'Tổng đơn', 'Trạng thái'], snapshot.recentOrders);

    const lines = blocks.map((row) =>
      row
        .map((cell) => {
          const s = String(cell ?? '');
          if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
          return s;
        })
        .join(',')
    );
    const csv = '\uFEFF' + [`TỔNG QUAN HOẠT ĐỘNG — ${snapshot.generatedAt}`, '', ...lines].join('\r\n');
    this.triggerDownload(csv, `${filenameBase}.csv`, 'text/csv;charset=utf-8;');
  }

  async downloadPdf(snapshot: DashboardExportSnapshot, filenameBase = 'tong-quan-vitacare'): Promise<void> {
    const pdfMake: any = (await import('pdfmake/build/pdfmake')).default;
    const pdfFontsMod: any = await import('pdfmake/build/vfs_fonts');
    pdfMake.vfs = pdfFontsMod?.default ?? pdfFontsMod;

    const table = (title: string, headers: string[], body: (string | number)[][]) => ({
      stack: [
        { text: title, style: 'h2', margin: [0, 10, 0, 6] },
        {
          table: {
            headerRows: 1,
            widths: Array(headers.length).fill('*'),
            body: [
              headers.map((h) => ({ text: h, style: 'th' })),
              ...body.map((r) => r.map((c) => String(c)))
            ]
          },
          layout: 'lightHorizontalLines'
        }
      ]
    });

    const content: any[] = [
      { text: 'TỔNG QUAN HOẠT ĐỘNG — VITACARE', style: 'title' },
      { text: `Xuất báo cáo: ${snapshot.generatedAt}`, margin: [0, 0, 0, 16] },
      table('Tóm tắt chỉ số', ['Chỉ số', 'Giá trị'], snapshot.summary),
      table('Phân tích doanh thu 30 ngày', ['Ngày', 'Doanh thu (đ)'], snapshot.revenue30d),
      table('Trạng thái khuyến mãi', ['Trạng thái', 'Số lượng'], snapshot.promotionStatus),
      table('Trạng thái đơn thuốc', ['Trạng thái', 'Số lượng'], snapshot.prescriptionOrderStatus),
      table('Trạng thái đơn hàng', ['Trạng thái', 'Số lượng'], snapshot.orderStatus),
      table('Trạng thái tư vấn đơn thuốc', ['Trạng thái', 'Số lượng'], snapshot.prescriptionConsult),
      table('Trạng thái tư vấn sản phẩm', ['Trạng thái', 'Số lượng'], snapshot.productConsult),
      table('Trạng thái tư vấn bệnh', ['Trạng thái', 'Số lượng'], snapshot.diseaseConsult),
      table('Phân hạng thành viên', ['Hạng', 'Số lượng'], snapshot.memberTiers),
      table('Xu hướng đơn hàng & đăng ký theo giờ', ['Giờ', 'Đơn hàng', 'Đăng ký'], snapshot.hourlyActivity),
      table('Sản phẩm bán chạy (top 3)', ['Sản phẩm', 'Lượt bán'], snapshot.topProducts),
      table('Cảnh báo tồn kho', ['Sản phẩm', 'Tồn kho'], [[snapshot.stockNote, ''], ...snapshot.stockAlerts]),
      table('Đơn hàng mới nhất (10 đơn)', ['Mã đơn', 'Khách hàng', 'Tổng đơn', 'Trạng thái'], snapshot.recentOrders)
    ];

    const docDefinition = {
      pageSize: 'A4',
      pageMargins: [40, 50, 40, 50],
      content,
      styles: {
        title: { fontSize: 16, bold: true },
        h2: { fontSize: 11, bold: true },
        th: { bold: true, fillColor: '#eeeeee' }
      },
      defaultStyle: { fontSize: 9 }
    };

    pdfMake.createPdf(docDefinition as any).download(`${filenameBase}.pdf`);
  }

  private triggerDownload(body: string, filename: string, mime: string): void {
    const blob = new Blob([body], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  private aggregatePromotionStatus(promotions: any[]): [string, number][] {
    const now = Date.now();
    const parseDate = (value: any): number | null => {
      if (!value) return null;
      const d = new Date(value);
      const t = d.getTime();
      return Number.isNaN(t) ? null : t;
    };
    let active = 0;
    let upcoming = 0;
    let ended = 0;
    (promotions || []).forEach((p: any) => {
      const start = parseDate(p.startDate || p.start_at || p.startTime);
      const end = parseDate(p.endDate || p.end_at || p.endTime);
      if (start !== null && now < start) upcoming++;
      else if (end !== null && now > end) ended++;
      else active++;
    });
    return [
      ['Đang diễn ra', active],
      ['Sắp diễn ra', upcoming],
      ['Đã kết thúc', ended]
    ];
  }

  private aggregatePrescriptionShortLabels(prescriptions: any[]): [string, number][] {
    const statuses = ['pending', 'waiting', 'unreachable', 'advised', 'cancelled'];
    const labels: Record<string, string> = {
      pending: 'Chờ',
      waiting: 'Tư vấn',
      unreachable: 'Chưa LH',
      advised: 'Đã TV',
      cancelled: 'Hủy'
    };
    const counts = statuses.reduce((acc, s) => ({ ...acc, [s]: 0 }), {} as Record<string, number>);
    (prescriptions || []).forEach((p: any) => {
      const s = String(p?.status || 'pending').toLowerCase();
      if (counts[s] !== undefined) counts[s]++;
    });
    return statuses.map((s) => [labels[s], counts[s]] as [string, number]);
  }

  private aggregateOrderPie(orders: any[]): [string, number][] {
    const delivered = (orders || []).filter((o) => o.status === 'delivered').length;
    const pending = (orders || []).filter((o) => o.status === 'pending').length;
    const other = (orders || []).length - delivered - pending;
    return [
      ['Hoàn tất', delivered],
      ['Chờ xử lý', pending],
      ['Khác', other]
    ];
  }

  private aggregatePrescriptionConsult(prescriptions: any[]): [string, number][] {
    const statuses = ['pending', 'waiting', 'unreachable', 'advised', 'cancelled'];
    const labels: Record<string, string> = {
      pending: 'Chờ xử lý',
      waiting: 'Đang tư vấn',
      unreachable: 'Chưa thể liên hệ',
      advised: 'Đã tư vấn',
      cancelled: 'Đã huỷ'
    };
    const counts = statuses.reduce((acc, s) => ({ ...acc, [s]: 0 }), {} as Record<string, number>);
    (prescriptions || []).forEach((p: any) => {
      const s = String(p?.status || 'pending').toLowerCase();
      if (counts[s] !== undefined) counts[s]++;
    });
    return statuses.map((s) => [labels[s], counts[s]] as [string, number]);
  }

  private aggregateProductConsult(products: any[]): [string, number][] {
    const getQuestionState = (q: any): 'pending' | 'assigned' | 'answered' => {
      if (q?.status === 'answered' && q?.answer) return 'answered';
      if (q?.status === 'assigned') return 'assigned';
      return 'pending';
    };
    const tally = { pending: 0, assigned: 0, answered: 0 };
    (products || []).forEach((p: any) => {
      (p?.questions || []).forEach((q: any) => {
        tally[getQuestionState(q)]++;
      });
    });
    return [
      ['Chờ xử lý', tally.pending],
      ['Đã phân công', tally.assigned],
      ['Đã trả lời', tally.answered]
    ];
  }

  private aggregateDiseaseConsult(diseaseRows: any[]): [string, number][] {
    const isPending = (q: any) => !q?.answer || q?.status === 'unreviewed' || q?.status === 'pending';
    let pending = 0;
    let answered = 0;
    (diseaseRows || []).forEach((row: any) => {
      (row?.questions || []).forEach((q: any) => {
        if (isPending(q)) pending++;
        else answered++;
      });
    });
    return [
      ['Chờ xử lý', pending],
      ['Đã trả lời', answered]
    ];
  }

  private aggregateMemberTiers(customers: any[]): [string, number][] {
    const tiers: Record<string, number> = { Đồng: 0, Bạc: 0, Vàng: 0 };
    (customers || []).forEach((c: any) => {
      const t = c.tiering || 'Đồng';
      if (t in tiers) tiers[t]++;
      else tiers['Vàng']++;
    });
    return (['Đồng', 'Bạc', 'Vàng'] as const).map((k) => [k, tiers[k]] as [string, number]);
  }

  private aggregateHourlyActivity(orders: any[], customers: any[]): [string, number, number][] {
    const orderHours = new Array(24).fill(0);
    (orders || []).forEach((o: any) => {
      const d = new Date(o.createdAt || o.route?.pending || Date.now());
      orderHours[d.getHours()]++;
    });
    const registrationHours = new Array(24).fill(0);
    (customers || []).forEach((u: any) => {
      const d = new Date(u.registerdate || u.createdAt || Date.now());
      registrationHours[d.getHours()]++;
    });
    return Array.from({ length: 24 }, (_, i) => [
      `${i}h`,
      orderHours[i],
      registrationHours[i]
    ]) as [string, number, number][];
  }
}
