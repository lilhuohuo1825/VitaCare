import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-recently-viewed-blogs',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './recently-viewed-blogs.html',
  styleUrls: ['../../products/product/product.css'],
})
export class RecentlyViewedBlogs {
  @Input() blogs: any[] = [];

  @Output() clearAll = new EventEmitter<void>();
  @Output() clickBlog = new EventEmitter<any>();

  onClearAll(): void {
    this.clearAll.emit();
  }

  onClickBlog(blog: any): void {
    this.clickBlog.emit(blog);
  }

  getBlogDetailLink(blog: any): string {
    if (!blog) return '/blog';
    const raw = String(blog.link || blog.slug || blog.url || '').trim();
    if (raw.startsWith('/blog/')) return raw;

    const slug = raw
      .replace(/^https?:\/\/[^/]+/i, '')
      .replace(/^\/?(blog|bai-viet)\//i, '')
      .replace(/\/$/, '')
      .replace(/\.html?$/i, '')
      .replace(/[?#].*$/, '')
      .trim();

    return slug ? `/blog/${encodeURIComponent(slug)}` : '/blog';
  }

  handleImageError(event: any): void {
    event.target.src = 'assets/images/homepage/blogs/ngu_ngon.jpg';
  }
}

