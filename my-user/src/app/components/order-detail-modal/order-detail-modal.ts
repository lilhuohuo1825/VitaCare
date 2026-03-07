import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-order-detail-modal',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="order-detail-modal">
      <!-- TODO: Implement order detail modal -->
    </div>
  `,
    styles: [`
    .order-detail-modal {
      display: none;
    }
  `]
})
export class OrderDetailModal { }
