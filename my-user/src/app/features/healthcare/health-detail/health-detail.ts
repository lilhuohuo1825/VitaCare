import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { BlogService } from '../../../core/services/blog.service';

export interface HealthIndicatorConfig {
  key: string;
  title: string;
  slug: string;
  description: string;
  image: string;
  themeColor: string;
  themeBg: string;
}

const INDICATORS: Record<string, HealthIndicatorConfig> = {
  bloodPressure: {
    key: 'bloodPressure',
    title: 'Theo dõi huyết áp',
    slug: 'huyet-ap',
    description: 'Theo dõi Huyết Áp giúp chăm sóc sức khỏe dễ dàng và tiện lợi hơn. Công cụ không những ghi nhận chỉ số huyết áp mà có thể đánh giá chỉ số nhịp tim.',
    image: '/assets/images/health/app_huyet_ap.jpg',
    themeColor: '#c42326',
    themeBg: '#ffe8ea',
  },
  bloodSugar: {
    key: 'bloodSugar',
    title: 'Theo dõi đường huyết',
    slug: 'duong-huyet',
    description: 'Tính năng Đo Đường Huyết hỗ trợ người dùng dễ dàng lập lịch đo và phân tích số liệu sức khỏe về đường huyết bản thân.',
    image: '/assets/images/health/app_duong_huyet.jpg',
    themeColor: '#3CA0E1',
    themeBg: '#E8F4FC',
  },
  bloodFat: {
    key: 'bloodFat',
    title: 'Theo dõi mỡ máu',
    slug: 'mo-mau',
    description: 'Đo mỡ máu giúp phát hiện nguy cơ bệnh tim mạch và các vấn đề sức khỏe liên quan.',
    image: '/assets/images/health/app_mo_mau.jpg',
    themeColor: '#e6a800',
    themeBg: '#fff3cd',
  },
  osteoporosis: {
    key: 'osteoporosis',
    title: 'Theo dõi loãng xương',
    slug: 'loang-xuong',
    description: 'Tính năng này giúp bạn theo dõi tình trạng xương và phát hiện sớm các dấu hiệu loãng xương.',
    image: '/assets/images/health/app_loang_xuong.jpg',
    themeColor: '#3E27D0',
    themeBg: '#EDEBFA',
  },
  menstruation: {
    key: 'menstruation',
    title: 'Theo dõi kinh nguyệt',
    slug: 'kinh-nguyet',
    description: 'Chu kỳ kinh nguyệt là một phần quan trọng đối với sức khoẻ của bạn. Ghi lại chi tiết chu kỳ kinh nguyệt kết hợp với việc hướng dẫn liên quan đến dinh dưỡng, luyện tập và hơn thế nữa.',
    image: '/assets/images/health/app_kinh_nguyet.jpg',
    themeColor: '#e83e8c',
    themeBg: '#fde8f4',
  },
  pregnancy: {
    key: 'pregnancy',
    title: 'Theo dõi thai kì',
    slug: 'thai-ki',
    description: 'Hỗ trợ đo số cân nặng tiêu chuẩn giúp các mẹ bầu theo dõi cân nặng của mình trong suốt thai kỳ.',
    image: '/assets/images/health/app_me_bau.jpg',
    themeColor: '#E72F8B',
    themeBg: '#FFD0EE',
  },
};

const SLUG_TO_KEY: Record<string, string> = {
  'huyet-ap': 'bloodPressure',
  'duong-huyet': 'bloodSugar',
  'mo-mau': 'bloodFat',
  'loang-xuong': 'osteoporosis',
  'kinh-nguyet': 'menstruation',
  'thai-ki': 'pregnancy',
};

@Component({
  selector: 'app-health-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './health-detail.html',
  styleUrl: './health-detail.css',
})
export class HealthDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private blogService = inject(BlogService);

  blogs = signal<any[]>([]);

  get config(): HealthIndicatorConfig | null {
    const key = this.route.snapshot.paramMap.get('key') || '';
    const resolvedKey = SLUG_TO_KEY[key] || key;
    return INDICATORS[resolvedKey] || null;
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const key = params.get('key') || '';
      const resolvedKey = SLUG_TO_KEY[key] || key;
      const cfg = INDICATORS[resolvedKey];
      if (cfg?.key) {
        this.blogService.getBlogsByIndicator(cfg.key, 5).subscribe({
          next: (res) => {
            this.blogs.set(Array.isArray(res?.blogs) ? res.blogs : []);
          },
          error: () => this.blogs.set([]),
        });
      } else {
        this.blogs.set([]);
      }
    });
  }

  getBlogKeyword(): string {
    const k = this.config?.key;
    const map: Record<string, string> = {
      bloodPressure: 'huyết áp',
      bloodSugar: 'đường huyết',
      bloodFat: 'mỡ máu',
      osteoporosis: 'loãng xương',
      menstruation: 'kinh nguyệt',
      pregnancy: 'thai kỳ',
    };
    return map[k || ''] || this.config?.title || '';
  }

  getBlogImageUrl(blog: any): string {
    const url = blog?.primaryImage?.url ?? blog?.image ?? blog?.imageUrl;
    if (!url) return 'assets/images/homepage/blogs/ngu_ngon.jpg';
    if (url.startsWith('http') || url.startsWith('assets/')) return url;
    return url.startsWith('/') ? url : `/${url}`;
  }
}
