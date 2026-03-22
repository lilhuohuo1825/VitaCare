import { Component, OnInit, AfterViewInit, OnDestroy, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DoctorService, Doctor } from '../../../core/services/doctor.service';

/** URL ảnh mặc định khi không có avatar bác sĩ (tránh 404 và img broken) */
const DEFAULT_DOCTOR_AVATAR = 'assets/images/banner/woman_doctor.png';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './about.html',
  styleUrl: './about.css',
})
export class About implements OnInit, AfterViewInit, OnDestroy {
  doctors: Doctor[] = [];
  isLoadingDoctors = false;

  private io: IntersectionObserver | null = null;
  private statsIo: IntersectionObserver | null = null;
  teamOverlayState: 'idle' | 'dropping' | 'hidden' = 'idle';
  activeStep: number = 1;
  // số liệu sứ mệnh
  yearsExperience = 0;
  provincesCount = 0;
  partnersCount = 0;
  categoriesCount = 0;
  private statsAnimated = false;

  constructor(
    private doctorService: DoctorService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) { }

  // Per-doctor overlay states: 'idle' | 'dropping' | 'hidden'
  doctorOverlayStates: Array<'idle' | 'dropping' | 'hidden'> = [];

  /** Trả về URL avatar an toàn (không rỗng) để tránh 404 và request lỗi. */
  getDoctorAvatar(doctor: Doctor): string {
    const src = doctor?.avatar?.src ?? (doctor?.avatar as any) ?? '';
    const url = typeof src === 'string' && src.trim() ? src.trim() : '';
    return url || DEFAULT_DOCTOR_AVATAR;
  }

  onDoctorImageError(event: Event): void {
    const el = event.target as HTMLImageElement;
    if (el && el.src !== DEFAULT_DOCTOR_AVATAR) {
      el.src = DEFAULT_DOCTOR_AVATAR;
    }
  }

  ngOnInit(): void {
    this.isLoadingDoctors = true;
    this.doctorService.getDoctors(4).subscribe({
      next: (data) => {
        this.doctors = Array.isArray(data) ? data : [];
        this.doctorOverlayStates = this.doctors.map(() => 'idle' as const);
        this.isLoadingDoctors = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Lỗi tải danh sách bác sĩ:', err);
        this.doctors = [];
        this.isLoadingDoctors = false;
        this.cdr.markForCheck();
      },
    });
  }

  ngAfterViewInit(): void {
    // Scroll reveal: content hiện dần khi lướt tới (scroll tới đâu hiện tới đó)
    const els = Array.from(document.querySelectorAll('.about-container .fade-in')) as HTMLElement[];
    if (els.length) {
      this.io = new IntersectionObserver((entries) => {
        this.ngZone.run(() => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              (e.target as HTMLElement).classList.add('is-visible');
              this.io?.unobserve(e.target);
            }
          });
        });
      }, {
        threshold: 0.08,
        rootMargin: '0px 0px -40px 0px'
      });
      els.forEach((el) => this.io?.observe(el));
    }

    // Observer riêng cho .mv-stats: chỉ kích hoạt đếm số khi lướt tới
    const statsEl = document.querySelector('.mv-stats') as HTMLElement | null;
    if (statsEl) {
      this.statsIo = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !this.statsAnimated) {
            this.statsAnimated = true;
            this.startStatsAnimation();
            this.statsIo?.disconnect();
          }
        });
      }, { threshold: 0.5 }); // >= 50% khối stats trong viewport mới trigger
      this.statsIo.observe(statsEl);
    }
  }

  ngOnDestroy(): void {
    this.io?.disconnect();
    this.io = null;
    this.statsIo?.disconnect();
    this.statsIo = null;
  }

  startTeamOverlayDrop(): void {
    if (this.teamOverlayState !== 'idle') {
      return;
    }

    this.teamOverlayState = 'dropping';

    setTimeout(() => {
      this.teamOverlayState = 'hidden';
    }, 700);
  }

  dropDoctorOverlay(index: number): void {
    if (this.doctorOverlayStates[index] !== 'idle') return;
    this.doctorOverlayStates[index] = 'dropping';
    setTimeout(() => {
      this.doctorOverlayStates[index] = 'hidden';
    }, 650);
  }

  setActiveStep(step: number): void {
    this.activeStep = step;
  }

  scrollToIntro(): void {
    const intro = document.getElementById('intro-section');
    const subcard = intro?.querySelector('.intro-hero-subcard');
    const el = subcard ?? intro;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const targetTop = window.scrollY + rect.top - window.innerHeight + 80;
    const clamped = Math.max(0, Math.min(targetTop, document.documentElement.scrollHeight - window.innerHeight));
    window.scrollTo({ top: clamped, behavior: 'smooth' });
  }

  private startStatsAnimation(): void {
    this.animateNumber('yearsExperience', 5, 1200);
    this.animateNumber('provincesCount', 34, 1400);
    this.animateNumber('partnersCount', 25, 1500);
    this.animateNumber('categoriesCount', 33, 1500);
  }

  private animateNumber(field: 'yearsExperience' | 'provincesCount' | 'partnersCount' | 'categoriesCount', target: number, durationMs: number): void {
    const startTime = performance.now();

    // Easing: easeOutExpo — chạy nhanh lúc đầu, chậm dần khi tới số thực tế
    const easeOutExpo = (t: number): number =>
      t === 1 ? 1 : 1 - Math.pow(2, -10 * t);

    this.ngZone.runOutsideAngular(() => {
      const step = (timestamp: number) => {
        const elapsed = timestamp - startTime;
        const progress = Math.min(1, elapsed / durationMs);
        const easedProgress = easeOutExpo(progress);
        const value = Math.round(easedProgress * target);

        this.ngZone.run(() => {
          (this as any)[field] = value;
          this.cdr.markForCheck();
        });

        if (progress < 1) {
          requestAnimationFrame(step);
        }
      };

      requestAnimationFrame(step);
    });
  }
}