import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { HealthApiService, HealthProfile } from '../../../core/services/health-api.service';

@Component({
  selector: 'app-health',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './health.html',
  styleUrl: './health.css',
})
export class Health implements OnInit {
  private authService = inject(AuthService);
  private healthApi = inject(HealthApiService);
  private router = inject(Router);

  profile = signal<HealthProfile | null>(null);
  loading = signal(true);
  loadError = signal<string | null>(null);
  /** Slug cho 6 chỉ số (dùng trong URL /health/:key) */
  readonly detailSlugs: Record<string, string> = {
    bloodPressure: 'huyet-ap',
    bloodSugar: 'duong-huyet',
    bloodFat: 'mo-mau',
    osteoporosis: 'loang-xuong',
    menstruation: 'kinh-nguyet',
    pregnancy: 'thai-ki',
  };

  readonly icons = {
    bmi: '/assets/icon/weight-device.png',
    bmr: '/assets/icon/kcal_7246702.png',
    medication: '/assets/icon/clock_16472429.png',
    bloodPressure: '/assets/icon/blood-pressure_3389235.png',
    bloodSugar: '/assets/icon/blood.png',
    bloodFat: '/assets/icon/oil_7849400.png',
    osteoporosis: '/assets/icon/fracture_18353001.png',
    menstruation: '/assets/icon/water-energy_3274977.png',
    pregnancy: '/assets/icon/pregnant_1382776.png',
  };

  ngOnInit(): void {
    const user = this.authService.currentUser();
    const userId = user?.user_id ?? '';
    if (!userId) {
      // Chưa đăng nhập: hiển thị text mô tả cho tất cả chỉ số (không gọi API)
      this.profile.set(null);
      this.loading.set(false);
      this.loadError.set(null);
      return;
    }
    this.healthApi.getProfile(userId).subscribe({
      next: (res) => {
        if (res.success && res.profile) {
          this.profile.set(res.profile);
        } else {
          this.profile.set({
            user_id: userId,
            bmi: null,
            bmiStatus: null,
            bmr: null,
            bmrStatus: null,
            bloodPressure: null,
            bloodPressureStatus: null,
            bloodSugar: null,
            bloodSugarStatus: null,
            bloodFat: null,
            bloodFatStatus: null,
            osteoporosis: null,
            osteoporosisStatus: null,
            menstruation: null,
            pregnancy: null,
            medicationReminder: [],
            updatedAt: null,
          });
        }
        this.loading.set(false);
        this.loadError.set(null);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set('Không tải được sổ sức khỏe.');
      },
    });
  }

  get p(): HealthProfile | null {
    return this.profile();
  }

  /** Trả về class CSS theo trạng thái: normal (xanh), warn (cam), danger (đỏ) */
  getStatusClass(status: string | null | undefined): string {
    if (!status) return '';
    const s = status.toLowerCase();
    if (s.includes('bình thường')) return 'health-card-status--normal';
    if (s.includes('thiếu cân') || s.includes('trung bình') || s.includes('cao nhẹ') ||
      s.includes('tiền tăng') || s.includes('tiền đái') || s.includes('loãng xương nhẹ') ||
      s.includes('đang mang thai')) return 'health-card-status--warn';
    if (s.includes('thừa cân') || s.includes('béo phì') || s.includes('cao huyết') ||
      s.includes('đái tháo đường') || (s.includes('cao') && !s.includes('nhẹ')) ||
      s.includes('loãng xương') && !s.includes('nhẹ')) return 'health-card-status--danger';
    return '';
  }

  /** Format updatedAt từ ISO string sang dd/MM/yyyy */
  formatUpdatedAt(iso: string | null | undefined): string {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return '';
    }
  }

  /** Mở trang chi tiết chỉ số sức khỏe */
  openDetail(key: string): void {
    const slug = this.detailSlugs[key];
    if (slug) this.router.navigate(['/health', slug]);
  }

  /** Mục nhắc uống thuốc đầu tiên (09:00 - Thuốc cảm - 2 viên) hoặc placeholder */
  get firstMedication(): { time: string; medicine: string; pills: string } | null {
    const list = this.p?.medicationReminder ?? [];
    if (list.length > 0) {
      const m = list[0];
      return {
        time: m.time ?? '09:00',
        medicine: m.medicine ?? 'Thuốc cảm',
        pills: m.pills != null ? String(m.pills) + ' viên' : '2 viên',
      };
    }
    return null;
  }
}
