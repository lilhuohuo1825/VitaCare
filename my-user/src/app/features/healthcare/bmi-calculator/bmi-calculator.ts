import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { HealthApiService } from '../../../core/services/health-api.service';
import { BlogService } from '../../../core/services/blog.service';

const BASE = '/assets/images/health/';
const IMG_MAP: Record<string, string> = {
    underweight: BASE + 'bmi_thieu_can.jpg',
    normal: BASE + 'bmi_binh_thuong.jpg',
    overweight: BASE + 'bmi_thua_can.jpg',
    obese1: BASE + 'bmi_beo_phi_1.jpg',
    obese2: BASE + 'bmi_beo_phi_2.jpg',
    default: BASE + 'bmi_mau.jpg',
};

@Component({
    selector: 'app-bmi-calculator',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, DecimalPipe],
    templateUrl: './bmi-calculator.html',
    styleUrl: './bmi-calculator.css',
})
export class BmiCalculator implements OnInit {
    readonly authService = inject(AuthService);
    private healthApi = inject(HealthApiService);
    private blogService = inject(BlogService);

    gender: 'male' | 'female' = 'female';
    dob = '';
    height = 165;
    weight = 55;

    bmiValue: number | null = null;
    bmrValue: number | null = null;
    bmiStatus = '';
    bmiStatusKey = '';
    bmiColorClass = '';

    // Ảnh hiện tại + trạng thái fade animation
    currentImagePath = signal(IMG_MAP['default']);
    imgSwitching = signal(false);
    private _lastStatusKey = '';

    /** Blogs cho BMI và BMR */
    bmiBlogs = signal<any[]>([]);
    bmrBlogs = signal<any[]>([]);

    ngOnInit(): void {
        this.calculate();
        this.fetchBlogs();
    }

    private fetchBlogs(): void {
        this.blogService.getBlogsByIndicator('bmi', 5).subscribe({
            next: (res) => this.bmiBlogs.set(Array.isArray(res?.blogs) ? res.blogs : []),
            error: () => this.bmiBlogs.set([]),
        });
        this.blogService.getBlogsByIndicator('bmr', 5).subscribe({
            next: (res) => this.bmrBlogs.set(Array.isArray(res?.blogs) ? res.blogs : []),
            error: () => this.bmrBlogs.set([]),
        });
    }

    getBlogImageUrl(blog: any): string {
        const url = blog?.primaryImage?.url ?? blog?.image ?? blog?.imageUrl;
        if (!url) return 'assets/images/homepage/blogs/ngu_ngon.jpg';
        if (url.startsWith('http') || url.startsWith('assets/')) return url;
        return url.startsWith('/') ? url : `/${url}`;
    }

    setGender(g: 'male' | 'female'): void {
        this.gender = g;
        this.calculate();
    }

    calculate(): void {
        const h = Number(this.height);
        const w = Number(this.weight);
        if (!h || !w || h < 50 || w < 10) {
            this.bmiValue = null;
            this.bmrValue = null;
            this.bmiStatus = '';
            this.bmiStatusKey = '';
            this.bmiColorClass = '';
            this._updateImage('default');
            return;
        }

        const hm = h / 100;
        this.bmiValue = w / (hm * hm);

        let newStatusKey: string;
        if (this.bmiValue < 18.5) {
            this.bmiStatus = 'Thiếu cân';
            newStatusKey = 'underweight';
            this.bmiColorClass = 'bmi-result-value--under';
        } else if (this.bmiValue < 23) {
            this.bmiStatus = 'Bình thường';
            newStatusKey = 'normal';
            this.bmiColorClass = 'bmi-result-value--normal';
        } else if (this.bmiValue < 25) {
            this.bmiStatus = 'Thừa cân';
            newStatusKey = 'overweight';
            this.bmiColorClass = 'bmi-result-value--over';
        } else if (this.bmiValue < 30) {
            this.bmiStatus = 'Béo phì độ I';
            newStatusKey = 'obese1';
            this.bmiColorClass = 'bmi-result-value--obese';
        } else {
            this.bmiStatus = 'Béo phì độ II';
            newStatusKey = 'obese2';
            this.bmiColorClass = 'bmi-result-value--obese2';
        }
        this.bmiStatusKey = newStatusKey;

        // BMR – Mifflin-St Jeor
        if (this.gender === 'male') {
            this.bmrValue = 10 * w + 6.25 * h - 5 * this.getAge() + 5;
        } else {
            this.bmrValue = 10 * w + 6.25 * h - 5 * this.getAge() - 161;
        }

        this._updateImage(newStatusKey);
    }

    /** Fade-out → ảnh mới → fade-in */
    private _updateImage(statusKey: string): void {
        const newPath = IMG_MAP[statusKey] ?? IMG_MAP['default'];
        if (this._lastStatusKey === statusKey) return; // không đổi thì bỏ qua
        this._lastStatusKey = statusKey;

        // Bước 1: fade out
        this.imgSwitching.set(true);
        setTimeout(() => {
            // Bước 2: đổi nguồn ảnh (trong khi ảnh đang mờ)
            this.currentImagePath.set(newPath);
            // Bước 3: fade in
            setTimeout(() => {
                this.imgSwitching.set(false);
            }, 50); // delay nhỏ để browser kịp paint src mới
        }, 300); // thời gian fade-out = 300ms
    }

    getAge(): number {
        if (!this.dob) return 25;
        const birth = new Date(this.dob);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return age > 0 ? age : 25;
    }

    reset(): void {
        this.gender = 'female';
        this.dob = '';
        this.height = 165;
        this.weight = 55;
        this._lastStatusKey = '';
        this.calculate();
    }

    save(): void {
        const user = this.authService.currentUser();
        if (!user?.user_id || this.bmiValue === null || this.bmrValue === null) return;
        this.healthApi.updateProfile({
            user_id: user.user_id,
            bmi: Math.round(this.bmiValue * 100) / 100,
            bmiStatus: this.bmiStatus,
            bmr: Math.round(this.bmrValue),
            bmrStatus: this.getBmrStatus(),
        }).subscribe();
    }

    private getBmrStatus(): string {
        if (!this.bmrValue) return '';
        if (this.bmrValue < 1200) return 'Thấp, nguy cơ';
        if (this.bmrValue < 1800) return 'Trung bình';
        return 'Cao';
    }
}
