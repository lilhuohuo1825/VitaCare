import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { BlogService } from '../../services/blog.service';

@Component({
  selector: 'app-blog-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './blog-detail.html',
  styleUrl: './blog-detail.css',
})
export class BlogDetail implements OnInit {
  blog: any = null;
  loading = true;
  error = false;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private blogService = inject(BlogService);
  private sanitizer = inject(DomSanitizer);

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug');
      if (slug) {
        this.loadBlog(slug);
      } else {
        this.error = true;
        this.loading = false;
      }
    });
  }

  private loadBlog(slug: string): void {
    this.loading = true;
    this.error = false;
    this.blog = null;
    window.scrollTo({ top: 0, behavior: 'instant' });

    this.blogService.getBlogBySlug(slug).subscribe({
      next: (data) => {
        if (!data || data.message === 'Not found') {
          this.error = true;
        } else {
          this.blog = data;
        }
        this.loading = false;
      },
      error: () => {
        this.error = true;
        this.loading = false;
      },
    });
  }

  getSafeHtml(html: string | undefined): SafeHtml {
    if (!html) return '';
    let cleaned = html
      .replace(/<p>\s*(?:&nbsp;)*\s*<\/p>/gi, '')
      .replace(/<p><br\s*\/?>\s*<\/p>/gi, '')
      .replace(/(?:<br\s*\/?>\s*){2,}/gi, '<br>')
      .replace(/<div>\s*<\/div>/gi, '');
    return this.sanitizer.bypassSecurityTrustHtml(cleaned);
  }

  getImageUrl(): string {
    if (!this.blog) return 'assets/images/homepage/blogs/an_gi.jpg';
    const url =
      this.blog.primaryImage?.url ||
      this.blog.image ||
      this.blog.imageUrl;
    if (!url) return 'assets/images/homepage/blogs/an_gi.jpg';
    if (typeof url === 'string' && (url.startsWith('http') || url.startsWith('/') || url.startsWith('assets/'))) {
      return url;
    }
    return `/${url}`;
  }

  getCategoryName(): string {
    if (!this.blog) return 'Bài viết';
    return (
      this.blog.categoryName ||
      this.blog.category?.name ||
      (Array.isArray(this.blog.categories) && this.blog.categories[0]?.category?.name) ||
      (Array.isArray(this.blog.categories) && this.blog.categories[0]?.name) ||
      'Bài viết'
    );
  }

  getContentHtml(): string | undefined {
    return this.blog?.descriptionHtml || this.blog?.description;
  }

  goBack(): void {
    this.router.navigate(['/bai-viet']);
  }
}
