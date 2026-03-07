import { Component, OnDestroy, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { BlogService } from '../../services/blog.service';

export interface BlogItem {
  title: string;
  image?: string;
  excerpt?: string;
  link?: string;
  categoryName?: string;
}

@Component({
  selector: 'app-bai-viet-blog',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './blog.html',
  styleUrl: './blog.css',
})
export class Blog implements OnInit, OnDestroy {
  blogs: BlogItem[] = [];
  loading = true;

  /** Category đang chọn (lọc hiển thị) - từ query ?category= hoặc click nút */
  activeCategory: string | null = null;

  /** Danh mục: tên + slug + mô tả ngắn (dùng cho hàng btn-cat và ô giới thiệu) */
  blogCategoryItems: { name: string; slug: string; intro: string }[] = [
    { name: 'Phòng bệnh & Sống khoẻ', slug: 'phong-benh-song-khoe', intro: 'Cách phòng bệnh và sống khỏe mỗi ngày qua chế độ ăn, vận động và lối sống lành mạnh.' },
    { name: 'Dinh dưỡng', slug: 'dinh-duong', intro: 'Kiến thức dinh dưỡng, thực đơn cân bằng và thực phẩm tốt cho sức khỏe.' },
    { name: 'Mẹ & bé', slug: 'me-va-be', intro: 'Chăm sóc thai kỳ, trẻ sơ sinh và nuôi dạy con khỏe mạnh.' },
    { name: 'Khỏe đẹp', slug: 'khoe-dep', intro: 'Làm đẹp an toàn, chăm sóc da và sức khỏe từ bên trong.' },
    { name: 'Giới tính', slug: 'gioi-tinh', intro: 'Sức khỏe sinh sản, tình dục an toàn và các vấn đề liên quan.' },
    { name: 'Tin tức sức khỏe', slug: 'tin-tuc-suc-khoe', intro: 'Tin tức y tế, nghiên cứu mới và cập nhật từ chuyên gia.' },
  ];

  /** Danh sách category cho nút lọc - lưu ổn định để tránh NG0100 khi data load xong */
  displayCategories: string[] = [];

  /** Giữ tên cho hàng btn-cat (tương thích template) - alias */
  get blogCategories(): string[] {
    return this.displayCategories.length > 0 ? this.displayCategories : this.blogCategoryItems.map((c) => c.name);
  }

  /** Blogs đã lọc theo activeCategory (dùng cho tất cả getter hiển thị) */
  get filteredBlogs(): BlogItem[] {
    if (!this.activeCategory) return this.blogs;
    const kw = this.activeCategory.toLowerCase();
    return this.blogs.filter((b) => (b.categoryName || '').toLowerCase().includes(kw));
  }

  onCategoryFilter(cat: string): void {
    const next = this.activeCategory === cat ? null : cat;
    this.activeCategory = next;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { category: next ? this.getCategoryQueryParam(next) : undefined },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  /** Trả về slug hoặc tên để dùng trong query param - ưu tiên slug cho URL gọn */
  getCategoryQueryParam(name: string): string {
    const byName = this.blogCategoryItems.find((c) => c.name === name);
    return byName ? byName.slug : name;
  }

  /** Bác sĩ chuyên khoa (sidebar Đội ngũ chuyên môn) - load từ MongoDB */
  doctors: { avatar: string; degree: string; name: string; specialize: string }[] = [];

  private readonly defaultDoctors: { avatar: string; degree: string; name: string; specialize: string }[] = [
    { avatar: 'assets/images/homepage/quiz/2_young_doctor.png', degree: 'Bác sĩ Chuyên khoa 1', name: 'Nguyễn Văn A', specialize: 'Nội tiết' },
    { avatar: 'assets/images/homepage/quiz/2_young_doctor.png', degree: 'Bác sĩ', name: 'Trần Thị B', specialize: 'Dinh dưỡng' },
    { avatar: 'assets/images/homepage/quiz/2_young_doctor.png', degree: 'Tiến sĩ', name: 'Lê Văn C', specialize: 'Tiêu hóa' },
    { avatar: 'assets/images/homepage/quiz/2_young_doctor.png', degree: 'Bác sĩ', name: 'Phạm Thị D', specialize: 'Tim mạch' },
    { avatar: 'assets/images/homepage/quiz/2_young_doctor.png', degree: 'Thạc sĩ', name: 'Hoàng Văn E', specialize: 'Nội tổng hợp' },
  ];

  private blogService = inject(BlogService);
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  private blogFallbackTimer: number | null = null;

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const raw = params['category'] ? String(params['category']).trim() : null;
      if (raw) {
        const bySlug = this.blogCategoryItems.find((c) => c.slug === raw);
        const byName = this.blogCategoryItems.find((c) => c.name === raw);
        this.activeCategory = bySlug ? bySlug.name : byName ? byName.name : raw;
      } else {
        this.activeCategory = null;
      }
    });
    this.loadBlogs();
    this.loadDoctors();
  }

  ngOnDestroy(): void {
    if (this.blogFallbackTimer !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.blogFallbackTimer);
      this.blogFallbackTimer = null;
    }
  }

  private loadDoctors(): void {
    this.http.get<any>('/api/doctors?limit=10').subscribe({
      next: (data: any) => {
        const arr = Array.isArray(data) ? data : (data?.items ?? data?.doctors ?? []);
        if (arr.length > 0) {
          this.doctors = arr.map((d: any) => this.normalizeDoctor(d));
        } else {
          this.doctors = [...this.defaultDoctors];
        }
      },
      error: () => {
        this.doctors = [...this.defaultDoctors];
      }
    });
  }

  private normalizeDoctor(d: any): { avatar: string; degree: string; name: string; specialize: string } {
    const avatarRaw =
      d.avatar ?? d.image ?? d.photo ?? d.avatarUrl ?? d.imageUrl ?? d.primaryImage ?? 'assets/images/homepage/quiz/2_young_doctor.png';
    const avatar =
      typeof avatarRaw === 'object' && avatarRaw !== null && avatarRaw.src
        ? this.ensureAvatarUrl(avatarRaw.src)
        : typeof avatarRaw === 'string'
          ? avatarRaw
          : 'assets/images/homepage/quiz/2_young_doctor.png';
    const degree = d.degree ?? d.hocVi ?? d.degreeTitle ?? d.title ?? '';
    const name = d.name ?? d.fullName ?? d.doctorName ?? 'Bác sĩ';
    const specialize = d.specialize ?? d.specialty ?? d.specialization ?? d.field ?? d.chuyenKhoa ?? '';
    return { avatar, degree, name, specialize };
  }

  private ensureAvatarUrl(src: string): string {
    if (!src || src.startsWith('http://') || src.startsWith('https://') || src.startsWith('assets/') || src.startsWith('/')) {
      return src || 'assets/images/homepage/quiz/2_young_doctor.png';
    }
    return `https://${src}`;
  }

  private loadBlogs(): void {
    // Nếu API chậm, sau ~1s sẽ hiển thị dữ liệu mẫu để người dùng không phải chờ trắng UI
    if (typeof window !== 'undefined') {
      this.blogFallbackTimer = window.setTimeout(() => {
        if (this.loading && this.blogs.length === 0) {
          this.setFallbackBlogs();
          this.loading = false;
        }
      }, 1000);
    }

    this.blogService.getBlogs({ limit: 40 }).subscribe({
      next: (res) => {
        const data = Array.isArray(res?.blogs) ? res.blogs : Array.isArray(res) ? res : [];
        this.blogs = data.map((b: any) => this.normalizeBlog(b));
        if (this.blogs.length === 0) this.setFallbackBlogs();
        this.loading = false;
        if (this.blogFallbackTimer !== null && typeof window !== 'undefined') {
          window.clearTimeout(this.blogFallbackTimer);
          this.blogFallbackTimer = null;
        }
        this.updateDisplayCategories();
        setTimeout(() => this.cdr.detectChanges(), 0);
      },
      error: () => {
        this.setFallbackBlogs();
        this.loading = false;
        if (this.blogFallbackTimer !== null && typeof window !== 'undefined') {
          window.clearTimeout(this.blogFallbackTimer);
          this.blogFallbackTimer = null;
        }
        this.updateDisplayCategories();
        setTimeout(() => this.cdr.detectChanges(), 0);
      }
    });
  }

  private normalizeBlog(b: any): BlogItem {
    const primaryCat = Array.isArray(b.categories) ? b.categories.find((c: any) => c?.category?.isPrimary) : null;
    const cat = primaryCat?.category ?? (Array.isArray(b.categories) ? b.categories[0]?.category : null);
    const fromCategories = cat?.name ?? (Array.isArray(b.categories) && b.categories[0] ? (b.categories[0] as any).name : undefined);
    const categoryName = fromCategories ?? (b as any).category?.name ?? (b as any).categoryName ?? 'Bài viết';
    const normalizeImageUrl = (src?: string | null): string | undefined => {
      if (!src) return undefined;
      if (typeof src !== 'string') return undefined;
      if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('assets/')) return src;
      if (src.startsWith('/')) return src;
      return `/${src}`;
    };
    const imgSrc = b.primaryImage?.url || b.image || b.imageUrl;
    const slugRaw = b.slug || '';
    const slugForUrl = slugRaw
      .replace(/^bai-viet\//i, '')
      .replace(/\.html?$/i, '')
      .trim();
    return {
      title: b.title || b.name || 'Bài viết sức khỏe',
      image: normalizeImageUrl(imgSrc) || 'assets/images/homepage/blogs/an_gi.jpg',
      excerpt: b.shortDescription || b.excerpt || (typeof b.description === 'string' ? b.description.replace(/<[^>]*>/g, '').slice(0, 160) : ''),
      link: slugForUrl ? `/bai-viet/${slugForUrl}` : undefined,
      categoryName: categoryName || 'Bài viết',
    };
  }

  private setFallbackBlogs(): void {
    this.blogs = [
      { title: 'Thanh toán 10 người nhập viện sau khi Ăn thịt, trứng cá xanh', image: 'assets/images/homepage/blogs/ngu_ngon.jpg', excerpt: 'Mô tả ngắn về sự cố an toàn thực phẩm...', link: '/bai-viet/anuong', categoryName: 'Tin tức' },
      { title: '5 thói quen giúp ngủ ngon hơn', image: 'assets/images/homepage/blogs/ngu_ngon.jpg', excerpt: 'Tổng hợp 5 thói quen dễ thực hiện...', link: '/bai-viet/ngu-ngon', categoryName: 'Dinh dưỡng' },
      { title: 'Ăn gì để tăng sức đề kháng?', image: 'assets/images/homepage/blogs/an_gi.jpg', excerpt: 'Các thực phẩm giàu vitamin...', link: '/bai-viet/tang-de-khang', categoryName: 'Dinh dưỡng' },
      { title: 'Cách xử trí khi bị cảm lạnh', image: 'assets/images/homepage/blogs/cam_cum.webp', excerpt: 'Mẹo chăm sóc tại nhà...', link: '/bai-viet/cam-lanh', categoryName: 'Sức khỏe' },
      { title: 'Chế độ ăn cho người tiểu đường', image: 'assets/images/homepage/blogs/an_gi.jpg', excerpt: 'Gợi ý thực đơn và lưu ý...', link: '/bai-viet/tieu-duong', categoryName: 'Chế độ dinh dưỡng' },
      { title: 'Phòng ngừa bệnh tim mạch', image: 'assets/images/homepage/blogs/an_gi.jpg', excerpt: 'Lối sống và dinh dưỡng...', link: '/bai-viet/tim-mach', categoryName: 'Phòng ngừa bệnh' },
      { title: 'Chăm sóc da mùa khô', image: 'assets/images/homepage/blogs/cam_cum.webp', excerpt: 'Bí quyết dưỡng ẩm...', link: '/bai-viet/lam-dep', categoryName: 'Sức khỏe làm đẹp' },
      { title: 'Dinh dưỡng cho bà bầu', image: 'assets/images/homepage/blogs/an_gi.jpg', excerpt: 'Thực phẩm nên và không nên...', link: '/bai-viet/me-va-be', categoryName: 'Chăm sóc mẹ và bé' },
      { title: 'Thuốc kháng sinh: dùng đúng cách', image: 'assets/images/homepage/blogs/cam_cum.webp', excerpt: 'Lưu ý khi sử dụng...', link: '/bai-viet/thuoc-benh', categoryName: 'Thuốc và bệnh' },
      { title: 'Sức khỏe cộng đồng trong mùa dịch', image: 'assets/images/homepage/blogs/ngu_ngon.jpg', excerpt: 'Cách bảo vệ bản thân và gia đình...', link: '/bai-viet/cong-dong', categoryName: 'Sức khỏe cộng đồng' },
    ];
  }

  private updateDisplayCategories(): void {
    const set = new Set<string>();
    this.blogs.forEach((b) => {
      const name = (b.categoryName || '').trim();
      if (name) set.add(name);
    });
    this.displayCategories = set.size > 0 ? Array.from(set).sort((a, b) => a.localeCompare(b, 'vi')) : [];
  }

  /** Danh sách category đang có trong data blogs (sau khi load API hoặc fallback) */
  get blogCategoriesFromData(): string[] {
    const set = new Set<string>();
    this.blogs.forEach((b) => {
      const name = (b.categoryName || '').trim();
      if (name) set.add(name);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }

  /** Bài nổi bật (Góc sức khỏe) */
  get mainBlog(): BlogItem | null {
    return this.filteredBlogs[0] ?? null;
  }

  /** 4 bài bên phải Góc sức khỏe */
  get relatedBlogs(): BlogItem[] {
    return this.filteredBlogs.slice(1, 5);
  }

  /** Chủ đề nổi bật: 6 bài dạng thẻ */
  get featuredTopics(): BlogItem[] {
    return this.filteredBlogs.slice(0, 6);
  }

  /** Bài viết mới nhất: list trái */
  get latestArticles(): BlogItem[] {
    return this.filteredBlogs.slice(0, 8);
  }

  /** Đọc nhiều nhất: chỉ tiêu đề */
  get mostReadTitles(): string[] {
    return this.filteredBlogs.slice(0, 10).map((b) => b.title);
  }

  /** Chuyên đề nổi bật: gom blogs theo categoryName - dùng full blogs để luôn có nội dung */
  get featuredTopicCategories(): { name: string; count: number }[] {
    const source = this.filteredBlogs.length > 0 ? this.filteredBlogs : this.blogs;
    const map = new Map<string, number>();
    source.forEach((b) => {
      const name = (b.categoryName || 'Bài viết').trim();
      map.set(name, (map.get(name) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }

  /** Map từng mục (tựa đề) sang từ khóa category để lọc blogs - khớp với BLOG_CATEGORIES.md và DB */
  private readonly sectionCategoryKeywords: Record<string, string[]> = {
    nutrition: ['chế độ dinh dưỡng', 'dinh dưỡng', 'ăn ngon khỏe', 'thực phẩm dinh dưỡng', 'chế độ ăn kiêng'],
    medicalNews: ['tin y học', 'y học', 'tin tức sức khỏe'],
    prevention: ['phòng ngừa bệnh', 'phòng bệnh', 'phòng ngừa', 'sống khoẻ', 'sống khỏe', 'phòng bệnh & sống khoẻ', 'phòng bệnh & sống khỏe', 'kiến thức y khoa', 'y học cổ truyền', 'sức khỏe gia đình', 'tiêm chủng', 'tâm lý', 'xét nghiệm'],
    beauty: ['sức khỏe làm đẹp', 'khỏe đẹp', 'làm đẹp', 'chăm sóc tóc', 'dưỡng da', 'chăm sóc cơ thể', 'mỹ phẩm'],
    momBaby: ['chăm sóc mẹ và bé', 'mẹ và bé', 'mẹ & bé', 'kế hoạch mang thai', 'mang thai', 'sinh con', 'chăm sóc bé'],
    gender: ['giới tính', 'gioi tinh', 'sức khỏe sinh sản', 'đời sống tình dục'],
    healthNews: ['tin tức sức khoẻ', 'tin tức sức khỏe', 'tin tuc suc khoe', 'tin y học', 'tin y dược', 'dịch bệnh', 'bệnh viện'],
    medicine: ['thuốc và bệnh', 'thuốc'],
    community: ['sức khỏe cộng đồng', 'cộng đồng'],
  };

  /** Lọc blogs theo category của mục - dùng full blogs để mỗi section luôn có nội dung */
  getBlogsByCategory(sectionKey: string, limit = 6, useFiltered = false): BlogItem[] {
    const source = useFiltered ? this.filteredBlogs : this.blogs;
    const keywords = this.sectionCategoryKeywords[sectionKey] || [];
    const lower = (s: string) => (s || '').toLowerCase().trim();
    const filtered = source.filter((b) => {
      const name = lower(b.categoryName || '');
      return keywords.some((kw) => name.includes(lower(kw)));
    });
    return filtered.slice(0, limit);
  }

  /** Chế độ dinh dưỡng: lọc theo category */
  get nutritionArticles(): BlogItem[] {
    const list = this.getBlogsByCategory('nutrition', 6);
    return list.length ? list : this.filteredBlogs.slice(0, 6);
  }

  /** Tin Y học: lọc theo category */
  get medicalNews(): BlogItem[] {
    const list = this.getBlogsByCategory('medicalNews', 5);
    return list.length ? list : this.filteredBlogs.slice(0, 5);
  }

  /** Phòng ngừa bệnh: 1 lớn + 4 nhỏ, lọc theo category */
  get preventionList(): BlogItem[] {
    return this.getBlogsByCategory('prevention', 10);
  }

  get preventionMain(): BlogItem | null {
    const list = this.preventionList;
    return list[0] ?? this.filteredBlogs[0] ?? null;
  }

  get preventionRelated(): BlogItem[] {
    const list = this.preventionList;
    return list.slice(1, 5).length ? list.slice(1, 5) : this.filteredBlogs.slice(1, 5);
  }

  /** Sub-categories cho thẻ "Phòng bệnh & Sống khoẻ" (nav ngang) */
  preventionSubCategories = [
    'Kiến thức y khoa',
    'Y học cổ truyền',
    'Sức khỏe gia đình',
    'Tiêm chủng',
    'Tâm lý - Tâm thần',
    'Xét Nghiệm',
  ];

  /** Bài viết cho thẻ Phòng bệnh & Sống khoẻ: 1 có ảnh + 1 không ảnh + 3 chỉ tiêu đề (từ category, thiếu thì bù từ blogs) */
  get preventionCardArticles(): BlogItem[] {
    const list = this.getBlogsByCategory('prevention', 5);
    if (list.length >= 5) return list;
    const used = new Set((list.map((b) => b.link || b.title)));
    const rest = this.filteredBlogs.filter((b) => !used.has(b.link || b.title));
    return [...list, ...rest].slice(0, 5);
  }

  /** Sub-categories cho thẻ "Dinh dưỡng" (nav ngang) */
  nutritionSubCategories = ['Ăn ngon khỏe', 'Thực phẩm dinh dưỡng', 'Chế độ ăn kiêng'];

  /** Bài viết cho thẻ Dinh dưỡng: 1 có ảnh + 1 không ảnh + 3 chỉ tiêu đề = 5 bài */
  get nutritionCardArticles(): BlogItem[] {
    const list = this.getBlogsByCategory('nutrition', 5);
    if (list.length >= 5) return list;
    const used = new Set((list.map((b) => b.link || b.title)));
    const rest = this.filteredBlogs.filter((b) => !used.has(b.link || b.title));
    return [...list, ...rest].slice(0, 5);
  }

  /** Sub-categories cho thẻ "Mẹ & bé" (nav ngang) */
  momBabySubCategories = ['Kế hoạch mang thai', 'Mang thai', 'Sinh con', 'Chăm sóc bé'];

  /** Bài viết cho thẻ Mẹ & bé: 1 có ảnh + 1 không ảnh + 3 chỉ tiêu đề (từ category Mẹ và bé) */
  get momBabyCardArticles(): BlogItem[] {
    const list = this.getBlogsByCategory('momBaby', 5);
    if (list.length >= 5) return list;
    const used = new Set((list.map((b) => b.link || b.title)));
    const rest = this.filteredBlogs.filter((b) => !used.has(b.link || b.title));
    return [...list, ...rest].slice(0, 5);
  }

  /** Sub-categories cho thẻ "Khỏe đẹp" (nav ngang) */
  beautySubCategories = ['Chăm sóc tóc', 'Dưỡng da', 'Chăm sóc cơ thể', 'Mỹ phẩm'];

  /** Bài viết cho thẻ Khỏe đẹp: 1 có ảnh + 1 không ảnh + 3 chỉ tiêu đề (từ category Khỏe đẹp) */
  get beautyCardArticles(): BlogItem[] {
    const list = this.getBlogsByCategory('beauty', 5);
    if (list.length >= 5) return list;
    const used = new Set((list.map((b) => b.link || b.title)));
    const rest = this.filteredBlogs.filter((b) => !used.has(b.link || b.title));
    return [...list, ...rest].slice(0, 5);
  }

  /** Sub-categories cho thẻ "Giới tính" (nav ngang) */
  genderSubCategories = ['Sức khỏe sinh sản', 'Đời sống tình dục'];

  /** Bài viết cho thẻ Giới tính: 1 có ảnh + 1 không ảnh + 3 chỉ tiêu đề (từ category Giới tính) */
  get genderCardArticles(): BlogItem[] {
    const list = this.getBlogsByCategory('gender', 5);
    if (list.length >= 5) return list;
    const used = new Set((list.map((b) => b.link || b.title)));
    const rest = this.filteredBlogs.filter((b) => !used.has(b.link || b.title));
    return [...list, ...rest].slice(0, 5);
  }

  /** Sub-categories cho thẻ "Tin tức sức khoẻ" (nav ngang) */
  healthNewsSubCategories = ['Tin y dược', 'Dịch bệnh', 'Bệnh viện'];

  /** Bài viết cho thẻ Tin tức sức khoẻ: 1 có ảnh + 1 không ảnh + 3 chỉ tiêu đề (từ category Tin tức sức khoẻ) */
  get healthNewsCardArticles(): BlogItem[] {
    const list = this.getBlogsByCategory('healthNews', 5);
    if (list.length >= 5) return list;
    const used = new Set((list.map((b) => b.link || b.title)));
    const rest = this.filteredBlogs.filter((b) => !used.has(b.link || b.title));
    return [...list, ...rest].slice(0, 5);
  }

  /** Sức khỏe làm đẹp: lọc theo category (list dạng khác) */
  get beautyArticles(): BlogItem[] {
    const list = this.getBlogsByCategory('beauty', 5);
    return list.length ? list : this.filteredBlogs.slice(0, 5);
  }

  /** Chăm sóc mẹ và bé: lọc theo category */
  get momBabyArticles(): BlogItem[] {
    const list = this.getBlogsByCategory('momBaby', 5);
    return list.length ? list : this.filteredBlogs.slice(0, 5);
  }

  /** Thuốc và bệnh: lọc theo category */
  get medicineArticles(): BlogItem[] {
    const list = this.getBlogsByCategory('medicine', 5);
    return list.length ? list : this.filteredBlogs.slice(0, 5);
  }

  /** Sức khỏe cộng đồng: lọc theo category */
  get communityArticles(): BlogItem[] {
    const list = this.getBlogsByCategory('community', 5);
    return list.length ? list : this.filteredBlogs.slice(0, 5);
  }
}
