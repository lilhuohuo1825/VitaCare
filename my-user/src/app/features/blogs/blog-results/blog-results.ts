import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-blog-results',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './blog-results.html',
  styleUrls: ['../../products/product/product.css'],
})
export class BlogResults {
  @Input() blogs: any[] = [];
  @Input() displayedBlogs: any[] = [];
  @Input() isLoading = false;
  @Input() initialBlogLimit = 6;
  @Input() blogDisplayLimit = 6;
  @Input() searchHistory: any[] = [];

  @Output() loadMoreBlogs = new EventEmitter<void>();
  @Output() collapseBlogs = new EventEmitter<void>();
  @Output() clearSearchHistory = new EventEmitter<void>();
  @Output() removeSearchHistoryItem = new EventEmitter<string>();
  @Output() trackRecentlyViewedBlog = new EventEmitter<any>();

  onLoadMoreBlogs(): void {
    this.loadMoreBlogs.emit();
  }

  onCollapseBlogs(): void {
    this.collapseBlogs.emit();
  }

  onClearSearchHistory(): void {
    this.clearSearchHistory.emit();
  }

  onRemoveSearchHistoryItem(keyword: string): void {
    this.removeSearchHistoryItem.emit(keyword);
  }

  onTrackRecentlyViewedBlog(blog: any): void {
    this.trackRecentlyViewedBlog.emit(blog);
  }

  handleImageError(event: any): void {
    event.target.src = 'assets/images/homepage/blogs/ngu_ngon.jpg';
  }
}

