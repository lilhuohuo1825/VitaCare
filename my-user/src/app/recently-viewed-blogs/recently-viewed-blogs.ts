import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-recently-viewed-blogs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './recently-viewed-blogs.html',
  styleUrls: ['../product/product.css'],
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
}

