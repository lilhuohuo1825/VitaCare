import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import maplibregl from 'maplibre-gl';
import {
  TOTAL_VITACARE_STORES,
  aggregateOrdersByProvince,
  distributeStores,
  type ProvinceCentroid,
  type ProvinceOrderAgg
} from './vn-map-utils';
import { apiTinhQueryVariants } from './centroid-to-api-tinh';
import { DashboardStore, StoreMapService } from './store-map.service';
import {
  MAP_STYLE_PROVIDER,
  MAP_TILES_API_KEY,
  buildVectorStyleUrl,
  isMapTilesConfigured
} from '../../config/map-tiles.config';

export type MapDashboardMode = 'stores' | 'orders';

@Component({
  selector: 'app-dashboard-vn-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-vn-map.component.html',
  styleUrl: './dashboard-vn-map.component.css'
})
export class DashboardVnMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() orders: any[] = [];

  @ViewChild('mapHost') mapHost!: ElementRef<HTMLDivElement>;

  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly storeMap = inject(StoreMapService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly ngZone = inject(NgZone);

  mapMode: MapDashboardMode = 'stores';
  provinces: ProvinceCentroid[] = [];
  selectedProvince: ProvinceCentroid | null = null;
  selectedStore: DashboardStore | null = null;

  storesInProvince: DashboardStore[] = [];
  storesLoading = false;
  storesError: string | null = null;
  usedApiTinh: string | null = null;

  storeByProvince = new Map<string, number>();
  orderByProvince = new Map<string, ProvinceOrderAgg>();

  loading = true;
  loadError: string | null = null;
  mapApiError: string | null = null;

  private map: maplibregl.Map | null = null;
  private mapMarkers: maplibregl.Marker[] = [];
  private geocodeCache = new Map<string, { lat: number; lng: number }>();
  private geocodeSkipped = new Set<string>();
  private mapViewVersion = 0;
  private geocodeProcessing = false;

  readonly totalStores = TOTAL_VITACARE_STORES;

  ngAfterViewInit(): void {
    this.http
      .get<ProvinceCentroid[]>('/geo/vn-province-centroids.json')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.provinces = list;
          this.storeByProvince = distributeStores(TOTAL_VITACARE_STORES, list);
          this.orderByProvince = aggregateOrdersByProvince(this.orders, list);
          this.loading = false;
          this.cdr.markForCheck();
          setTimeout(() => this.initMap(), 0);
        },
        error: () => {
          this.loading = false;
          this.loadError = 'Không tải được dữ liệu bản đồ.';
          this.cdr.markForCheck();
        }
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['orders'] && this.provinces.length > 0 && this.map) {
      this.orderByProvince = aggregateOrdersByProvince(this.orders, this.provinces);
      this.refreshMarkers();
    }
  }

  ngOnDestroy(): void {
    this.teardownMap();
  }

  setMode(mode: MapDashboardMode): void {
    if (this.mapMode === mode) return;
    this.mapMode = mode;
    this.resetProvinceAndStore();
    this.refreshMarkers();
    this.cdr.markForCheck();
  }

  selectProvince(p: ProvinceCentroid): void {
    this.mapViewVersion++;
    this.selectedProvince = p;
    this.selectedStore = null;
    this.storesInProvince = [];
    this.storesError = null;
    this.usedApiTinh = null;
    this.geocodeCache.clear();
    this.geocodeSkipped.clear();

    if (this.mapMode === 'stores') {
      this.storesLoading = true;
      this.refreshMarkers();
      this.loadStoresForProvince(p);
    } else {
      this.refreshMarkers();
    }
    this.cdr.markForCheck();
  }

  private loadStoresForProvince(p: ProvinceCentroid): void {
    const variants = apiTinhQueryVariants(p.name);
    this.storeMap.fetchStoresWithVariants(variants).subscribe({
      next: ({ stores, usedTinh }) => {
        this.storesInProvince = stores;
        this.usedApiTinh = usedTinh;
        this.storesLoading = false;
        this.storesError = null;
        this.cdr.markForCheck();
        setTimeout(() => this.refreshMarkers(), 0);
      },
      error: () => {
        this.storesLoading = false;
        this.storesError = 'Không tải được danh sách cửa hàng. Kiểm tra backend (localhost:3000).';
        this.storesInProvince = [];
        this.cdr.markForCheck();
        setTimeout(() => this.refreshMarkers(), 0);
      }
    });
  }

  selectStore(store: DashboardStore): void {
    this.selectedStore = store;
    this.cdr.markForCheck();
    this.refreshMarkers();
  }

  private selectStoreFromMap(store: DashboardStore): void {
    this.selectStore(store);
  }

  private normalizeCoord(v: unknown): number | null {
    if (v == null) return null;
    const n =
      typeof v === 'number'
        ? v
        : typeof v === 'string'
          ? parseFloat(v.trim().replace(',', '.'))
          : NaN;
    return Number.isFinite(n) ? n : null;
  }

  private storeCacheKey(s: DashboardStore): string {
    return String(s.ma_cua_hang || s._id || this.addressLine(s));
  }

  private parseStoreLatLng(s: DashboardStore): [number, number] | null {
    const key = this.storeCacheKey(s);
    const cached = this.geocodeCache.get(key);
    if (cached) return [cached.lat, cached.lng];

    let lat = this.normalizeCoord(s.toa_do?.lat);
    let lng = this.normalizeCoord(s.toa_do?.lng);
    if (lat != null && lng != null) return [lat, lng];

    const raw = s as Record<string, unknown>;
    const loc = raw['location'] as { type?: string; coordinates?: number[] } | undefined;
    if (loc?.type === 'Point' && Array.isArray(loc.coordinates) && loc.coordinates.length >= 2) {
      lng = this.normalizeCoord(loc.coordinates[0]);
      lat = this.normalizeCoord(loc.coordinates[1]);
      if (lat != null && lng != null) return [lat, lng];
    }

    lat = this.normalizeCoord(raw['vi_do']);
    lng = this.normalizeCoord(raw['kinh_do']);
    if (lat != null && lng != null) return [lat, lng];

    return null;
  }

  private focusProvinceCentroid(p: ProvinceCentroid, zoom = 9): void {
    if (!this.map) return;
    const lat = this.normalizeCoord(p.lat);
    const lng = this.normalizeCoord(p.lng);
    if (lat == null || lng == null) return;
    this.map.jumpTo({ center: [lng, lat], zoom });
    this.triggerResize();
  }

  clearProvinceSelection(): void {
    this.resetProvinceAndStore();
    this.refreshMarkers();
    this.cdr.markForCheck();
  }

  clearStoreSelection(): void {
    this.selectedStore = null;
    this.cdr.markForCheck();
    this.refreshMarkers();
  }

  private resetProvinceAndStore(): void {
    this.mapViewVersion++;
    this.selectedProvince = null;
    this.selectedStore = null;
    this.storesInProvince = [];
    this.storesLoading = false;
    this.storesError = null;
    this.usedApiTinh = null;
    this.geocodeCache.clear();
    this.geocodeSkipped.clear();
  }

  countForProvince(p: ProvinceCentroid): number {
    if (this.mapMode === 'stores') {
      return this.storeByProvince.get(p.name) ?? 0;
    }
    return this.orderByProvince.get(p.name)?.total ?? 0;
  }

  orderDetailForSelected(): ProvinceOrderAgg | null {
    if (!this.selectedProvince) return null;
    return (
      this.orderByProvince.get(this.selectedProvince.name) ?? {
        total: 0,
        homeDelivery: 0,
        pharmacyPickup: 0,
        samples: []
      }
    );
  }

  formatMoney(v: unknown): string {
    const n = Number(v);
    if (!Number.isFinite(n)) return '—';
    return `${n.toLocaleString('vi-VN')}đ`;
  }

  orderLabel(o: any): string {
    return String(o?.order_id || o?.orderCode || o?._id || '').slice(0, 24) || '—';
  }

  deliveryLabel(o: any): string {
    return o?.atPharmacy ? 'Nhận tại nhà thuốc' : 'Giao tận nơi';
  }

  addressLine(store: DashboardStore): string {
    const d = store.dia_chi;
    if (!d) return '—';
    if (d.dia_chi_day_du) return d.dia_chi_day_du;
    const parts = [d.so_nha, d.duong, d.phuong_xa, d.quan_huyen, d.tinh_thanh].filter(Boolean);
    return parts.join(', ') || '—';
  }

  isOpen(store: DashboardStore): boolean {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const day = now.getDay();
    const schedule = store.thoi_gian_hoat_dong;
    if (!schedule) return true;
    const slot = day === 0 ? schedule.chu_nhat : day === 6 ? schedule.thu_7 : schedule.thu_2_6;
    if (!slot?.mo_cua || !slot?.dong_cua) return true;
    const [openH, openM] = slot.mo_cua.split(':').map(Number);
    const [closeH, closeM] = slot.dong_cua.split(':').map(Number);
    const nowMin = hours * 60 + minutes;
    return nowMin >= openH * 60 + openM && nowMin < closeH * 60 + closeM;
  }

  getTodayHours(store: DashboardStore): string {
    const day = new Date().getDay();
    const gio = store.thoi_gian_hoat_dong;
    if (!gio) return '';
    const slot = day === 0 ? gio.chu_nhat : day === 6 ? gio.thu_7 : gio.thu_2_6;
    if (!slot) return '—';
    return `${slot.mo_cua} – ${slot.dong_cua}`;
  }

  getStarArray(rating: number): string[] {
    const stars: string[] = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= Math.floor(rating)) stars.push('full');
      else if (i - rating < 1) stars.push('half');
      else stars.push('empty');
    }
    return stars;
  }

  getMapUrl(store: DashboardStore): SafeResourceUrl | null {
    const ll = this.parseStoreLatLng(store);
    if (!ll) return null;
    const [lat, lng] = ll;
    const url = `https://maps.google.com/maps?q=${lat},${lng}&hl=vi&z=17&output=embed`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  openMap(store: DashboardStore): void {
    const ll = this.parseStoreLatLng(store);
    if (ll) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${ll[0]},${ll[1]}`, '_blank');
    }
  }

  callPhone(phone: string): void {
    window.open(`tel:${phone}`, '_self');
  }

  private initMap(): void {
    if (!this.mapHost?.nativeElement || this.map) return;

    if (!isMapTilesConfigured()) {
      this.mapApiError =
        'Chưa cấu hình bản đồ: mở src/app/config/map-tiles.config.ts — đặt MAP_STYLE_PROVIDER (maptiler | mapbox) và dán MAP_TILES_API_KEY (free tier).';
      this.cdr.markForCheck();
      return;
    }

    const style = buildVectorStyleUrl();
    if (!style) {
      this.mapApiError = 'Không tạo được URL style bản đồ.';
      this.cdr.markForCheck();
      return;
    }

    this.mapApiError = null;
    const el = this.mapHost.nativeElement;
    this.map = new maplibregl.Map({
      container: el,
      style,
      center: [106.8, 16.2],
      zoom: 5,
      minZoom: 5,
      maxZoom: 18
    });

    this.map.addControl(new maplibregl.NavigationControl(), 'top-left');
    this.map.addControl(new maplibregl.FullscreenControl(), 'top-right');

    this.map.on('error', (e) => {
      console.error('[MapLibre]', e);
      this.mapApiError =
        'Lỗi tải bản đồ vector. Kiểm tra MAP_TILES_API_KEY và hạn mức free tier trên MapTiler hoặc Mapbox.';
      this.cdr.markForCheck();
    });

    this.map.once('load', () => {
      this.mapApiError = null;
      this.map!.fitBounds(
        [
          [102, 8.2],
          [110.2, 23.9]
        ],
        { padding: 16 }
      );
      this.refreshMarkers();
      this.triggerResize();
      this.cdr.markForCheck();
    });
  }

  private triggerResize(): void {
    if (!this.map) return;
    queueMicrotask(() => this.map?.resize());
  }

  private teardownMap(): void {
    this.clearMarkers();
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  private clearMarkers(): void {
    for (const m of this.mapMarkers) {
      m.remove();
    }
    this.mapMarkers = [];
  }

  private pushMarker(m: maplibregl.Marker): void {
    this.mapMarkers.push(m);
  }

  private refreshMarkers(): void {
    if (!this.map || !this.map.loaded()) return;

    this.clearMarkers();

    if (this.mapMode === 'orders' || !this.selectedProvince) {
      this.plotProvinceCircles();
      return;
    }

    if (this.mapMode === 'stores' && this.selectedProvince) {
      if (this.storesLoading) {
        this.plotProvinceCircles();
        this.focusProvinceCentroid(this.selectedProvince, 9);
        return;
      }
      this.plotStoreMarkers();
    }
  }

  private plotProvinceCircles(): void {
    if (!this.map) return;
    const maxVal = Math.max(1, ...this.provinces.map((p) => this.countForProvince(p)));

    for (const p of this.provinces) {
      const count = this.countForProvince(p);
      const t = maxVal > 0 ? Math.log1p(count) / Math.log1p(maxVal) : 0;
      const r = Math.min(26, 8 + t * 18);
      const fill = this.mapMode === 'stores' ? '#00589f' : '#7b63c6';
      const stroke = this.mapMode === 'stores' ? 'rgba(0,88,159,0.55)' : 'rgba(91,33,182,0.5)';

      const el = document.createElement('div');
      el.style.width = `${r}px`;
      el.style.height = `${r}px`;
      el.style.borderRadius = '50%';
      el.style.background = fill;
      el.style.opacity = String(0.22 + t * 0.2);
      el.style.border = `1.25px solid ${stroke}`;
      el.style.cursor = 'pointer';
      el.style.boxSizing = 'border-box';
      el.title = `${p.name} · ${count}${this.mapMode === 'stores' ? ' CH (ước lượng)' : ' đơn'}`;

      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        this.ngZone.run(() => this.selectProvince(p));
      });

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([p.lng, p.lat])
        .addTo(this.map);
      this.pushMarker(marker);
    }
  }

  private escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private plotStoreMarkers(): void {
    if (!this.map) return;

    const boundsPts: maplibregl.LngLatLike[] = [];
    const withCoord = this.storesInProvince.filter((s) => this.parseStoreLatLng(s) != null);

    for (const s of withCoord) {
      const ll = this.parseStoreLatLng(s)!;
      const [lat, lng] = ll;
      boundsPts.push([lng, lat]);

      const sel =
        this.selectedStore &&
        (this.selectedStore.ma_cua_hang === s.ma_cua_hang ||
          this.selectedStore._id === s._id);

      const el = document.createElement('div');
      const size = sel ? 20 : 12;
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.borderRadius = '50%';
      el.style.background = sel ? '#43a2e6' : '#00589f';
      el.style.border = sel ? '2.5px solid #2b3e66' : '1.5px solid #fff';
      el.style.cursor = 'pointer';
      el.style.boxSizing = 'border-box';
      el.title = `${s.ten_cua_hang || s.ma_cua_hang || 'VitaCare'} — ${this.addressLine(s)}`;

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([lng, lat])
        .addTo(this.map);

      marker.getElement().addEventListener('click', (ev) => {
        ev.stopPropagation();
        this.ngZone.run(() => {
          new maplibregl.Popup({ closeOnClick: true, maxWidth: '300px' })
            .setLngLat([lng, lat])
            .setHTML(
              `<div style="line-height:1.45;padding:2px 0">
                <strong>${this.escapeHtml(s.ten_cua_hang || 'VitaCare')}</strong><br/>
                <span style="font-size:12px;color:#444">${this.escapeHtml(this.addressLine(s))}</span>
              </div>`
            )
            .addTo(this.map!);
          this.selectStoreFromMap(s);
        });
      });

      this.pushMarker(marker);
    }

    const selectedLl = this.selectedStore ? this.parseStoreLatLng(this.selectedStore) : null;
    if (selectedLl) {
      const [lat, lng] = selectedLl;
      this.map.flyTo({ center: [lng, lat], zoom: 17, essential: true });
      this.triggerResize();
      this.scheduleGeocodeMissing();
      return;
    }

    if (boundsPts.length === 0) {
      if (this.selectedProvince) {
        this.focusProvinceCentroid(this.selectedProvince, 10);
      }
      this.scheduleGeocodeMissing();
      return;
    }

    if (boundsPts.length === 1) {
      this.map.jumpTo({ center: boundsPts[0] as [number, number], zoom: 13 });
      this.triggerResize();
      this.scheduleGeocodeMissing();
      return;
    }

    const b = new maplibregl.LngLatBounds();
    boundsPts.forEach((pt) => b.extend(pt as maplibregl.LngLatLike));
    this.map.fitBounds(b, { padding: 48, maxZoom: 12 });
    this.scheduleGeocodeMissing();
  }

  private scheduleGeocodeMissing(): void {
    if (!this.map || this.geocodeProcessing) return;
    const session = this.mapViewVersion;
    const left = this.storesInProvince.filter((s) => {
      const key = this.storeCacheKey(s);
      return (
        !this.parseStoreLatLng(s) &&
        this.addressLine(s) !== '—' &&
        !this.geocodeSkipped.has(key)
      );
    });
    if (left.length === 0) return;

    this.geocodeProcessing = true;
    const s = left[0];

    void this.runGeocodeForStore(s).finally(() => {
      this.ngZone.run(() => {
        this.geocodeProcessing = false;
        if (!this.map || session !== this.mapViewVersion) return;
        setTimeout(() => this.refreshMarkers(), 200);
      });
    });
  }

  private async runGeocodeForStore(s: DashboardStore): Promise<void> {
    const addr = `${this.addressLine(s)}, Vietnam`;
    const key = this.storeCacheKey(s);

    if (MAP_STYLE_PROVIDER === 'maptiler' && MAP_TILES_API_KEY.trim()) {
      try {
        const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(addr)}.json?key=${encodeURIComponent(MAP_TILES_API_KEY.trim())}`;
        const res = await fetch(url);
        const data = (await res.json()) as {
          features?: { geometry?: { coordinates?: [number, number] } }[];
        };
        const c = data.features?.[0]?.geometry?.coordinates;
        if (c && c.length >= 2) {
          this.geocodeCache.set(key, { lat: c[1], lng: c[0] });
          return;
        }
      } catch {
        /* Nominatim */
      }
    }

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}&limit=1`;
      const res = await fetch(url, {
        headers: {
          'Accept-Language': 'vi',
          'User-Agent': 'VitaCareAdmin/1.0 (dashboard map)'
        }
      });
      const arr = (await res.json()) as { lat: string; lon: string }[];
      if (arr?.[0]) {
        this.geocodeCache.set(key, {
          lat: parseFloat(arr[0].lat),
          lng: parseFloat(arr[0].lon)
        });
        return;
      }
    } catch {
      /* skip */
    }

    this.geocodeSkipped.add(key);
  }
}
