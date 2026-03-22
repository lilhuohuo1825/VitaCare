import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface ReviewProduct {
    id: string;
    productName: string;
    productImage?: string;
    category: string;
    rating?: number | null;
    reviewText?: string | null;
    images?: (string | null)[];
    sku?: string;
}

@Component({
  selector: 'app-review-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="review-modal-backdrop">
      <div class="review-modal-overlay" (click)="onClose()"></div>

      <div class="review-modal-panel">
        <!-- Top bar -->
        <div class="review-modal-topbar">
          <h2 class="review-modal-title review-modal-topbar-title">
            Đánh giá đơn hàng
          </h2>
          <button type="button" class="icon-btn icon-btn-sm review-modal-topbar-close" (click)="onClose()">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <div class="review-modal-body">
            <div
              *ngFor="let product of localProducts; let i = index"
              class="mb-2 pb-1"
            >
              <!-- Product info -->
              <div class="flex gap-3 mb-1">
                <div class="flex-shrink-0">
                  <img
                    [src]="product.productImage"
                    [alt]="product.productName"
                    class="review-product-img"
                    onerror="this.src='assets/icon/no-order.png'"
                  />
                </div>
                <div class="flex flex-column justify-between">
                  <div>
                    <h3 class="text-base font-semibold mb-1">
                      {{ product.productName }}
                    </h3>
                    <p class="text-sm text-secondary m-0">
                      {{ product.category }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Rating -->
              <div class="mb-2 review-rating-box">
                <!-- Drag/hover to select stars (mouse + touch) -->
                <div
                  class="review-stars-row"
                  (pointerdown)="onRatingPointerDown($event, i)"
                  (pointermove)="onRatingPointerMove($event, i)"
                  (pointerup)="onRatingPointerUp($event, i)"
                  (pointercancel)="onRatingPointerUp($event, i)"
                >
                  <ng-container *ngFor="let star of stars; let s = index">
                    <i
                      class="bi review-star-icon"
                      [ngClass]="{
                        'bi-star-fill review-star-active cursor-pointer': s + 1 <= (product.rating || 0),
                        'bi-star review-star-inactive cursor-pointer': s + 1 > (product.rating || 0)
                      }"
                      (click)="setRating(i, s + 1)"
                    (pointerenter)="onStarHover(i, s + 1)"
                    ></i>
                  </ng-container>
                </div>

                <div class="rating-box-label" *ngIf="product.rating">
                  {{ getRatingLabel(product.rating) }}
                </div>
              </div>

              <!-- Review text -->
              <div class="mb-2">
                <div class="review-textarea-wrap">
                  <textarea
                    class="input review-textarea"
                    rows="3"
                    maxlength="500"
                    placeholder="Chia sẻ cảm nhận của bạn về sản phẩm này..."
                    [(ngModel)]="localProducts[i].reviewText"
                  ></textarea>
                  <div class="review-char-counter">
                    {{ (localProducts[i].reviewText || '').length }}/500
                  </div>
                </div>
              </div>

              <!-- Images -->
              <div class="mb-1">
                <div class="text-sm font-semibold mb-1">Thêm hình ảnh</div>
                <div class="review-image-row review-image-options">
                  <!-- Option 1: camera -->
                  <div
                    class="review-image-slot review-image-slot-camera cursor-pointer"
                    (click)="onCameraOptionClick($event, i, cameraInput)"
                  >
                    <div class="camera-slot-content">
                      <i class="bi bi-camera-fill"></i>
                      <span>Chụp ảnh</span>
                    </div>
                    <input
                      #cameraInput
                      type="file"
                      accept="image/*"
                      capture="environment"
                      (change)="onOptionFileSelected($event, i)"
                      hidden
                    />
                  </div>

                  <!-- Option 2: upload -->
                  <label
                    class="review-image-slot review-image-slot-upload cursor-pointer"
                  >
                    <div class="camera-slot-content">
                      <i class="bi bi-upload"></i>
                      <span>Tải ảnh</span>
                    </div>
                    <input
                      #uploadInput
                      type="file"
                      accept="image/*"
                      (change)="onOptionFileSelected($event, i)"
                      hidden
                    />
                  </label>
                </div>

                <!-- Preview slots: ô 3-7 -->
                <div class="review-image-row review-image-previews">
                  <div
                    *ngFor="let slot of previewSlots; let slotIndex = index"
                    class="review-image-slot"
                  >
                    <ng-container *ngIf="getPreviewImage(i, slotIndex) as preview; else previewEmpty">
                      <img [src]="preview" alt="Hình đánh giá" />
                      <button
                        type="button"
                        class="review-image-remove-btn"
                        (click)="removePreviewImage($event, i, slotIndex)"
                        aria-label="Xóa ảnh"
                        title="Xóa ảnh"
                      >
                        <i class="bi bi-x-lg"></i>
                      </button>
                    </ng-container>
                    <ng-template #previewEmpty>
                      <span class="plus-icon">+</span>
                    </ng-template>
                  </div>
                </div>
              </div>
            </div>
        </div>

        <div class="camera-capture-overlay" *ngIf="showCameraCaptureModal" (click)="closeCameraCaptureModal()">
          <div class="camera-capture-panel" (click)="$event.stopPropagation()">
            <div class="camera-capture-title">Chụp ảnh</div>
            <video #cameraVideo class="camera-video" autoplay playsinline muted></video>
            <div class="camera-actions">
              <button type="button" class="btn btn-sm review-btn-cancel" (click)="closeCameraCaptureModal()">Hủy</button>
              <button type="button" class="btn btn-sm review-btn-submit" (click)="captureFromCamera()">Chụp</button>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="review-modal-footer">
          <button
            type="button"
            class="btn btn-sm review-btn-cancel"
            (click)="onClose()"
          >
            Hủy
          </button>
          <button
            type="button"
            class="btn btn-sm review-btn-submit"
            [disabled]="!canSubmit()"
            (click)="onSubmitClicked()"
          >
            <span class="review-btn-submit-title">Gửi đánh giá</span>
            <span class="review-btn-submit-xu">
              <i class="bi bi-coin"></i> +200 xu
            </span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .review-modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: var(--z-modal);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .review-modal-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.45);
      }

      .review-modal-panel {
        position: relative;
        max-width: 520px;
        width: 100%;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        z-index: calc(var(--z-modal) + 1);
        border-radius: 14px;
        background: #fff;
        border: 1px solid var(--color-neutral-30);
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
        overflow: hidden; /* cố định header, scroll ở body bên dưới */
        overflow-x: hidden;
      }

      .review-modal-topbar {
        min-height: 56px;
        background: #00589F;
        padding: 0 18px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        position: sticky;
        top: 0;
        z-index: 5;
        border-radius: 14px 14px 0 0; /* bám theo viền trên của khung */
        flex-shrink: 0;
        width: 100%;
        box-sizing: border-box;
      }

      .review-modal-topbar-title {
        color: #ffffff !important;
        margin: 0;
        font-weight: 800;
        font-size: 20px;
      }

      .review-modal-topbar-close {
        background: rgba(255, 255, 255, 0.18) !important;
        color: #ffffff !important;
        border-radius: 999px;
        border: none;
      }

      .review-modal-body {
        margin-top: 0;
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 12px 18px 10px 18px;
        scrollbar-width: thin; /* Firefox */
        scrollbar-color: rgba(0, 0, 0, 0.28) transparent;
      }

      .review-modal-body::-webkit-scrollbar {
        width: 6px;
      }

      .review-modal-body::-webkit-scrollbar-track {
        background: transparent;
      }

      .review-modal-body::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.28);
        border-radius: 999px;
      }

      .review-modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: var(--spacing-3);
        margin-top: 0;
        padding: 0 18px 10px;
        flex-shrink: 0;
        background: #fff;
      }

      .review-modal-title {
        font-family: var(--font-family-title);
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-semibold);
        color: var(--color-primary);
        margin: 0;
      }

      .review-product-img {
        width: 72px;
        height: 72px;
        border-radius: var(--radius-md);
        object-fit: cover;
        border: 1px solid var(--color-neutral-40);
      }

      .review-textarea {
        resize: vertical;
        min-height: 72px;
        padding-bottom: 28px; /* chừa chỗ cho counter trong textarea */
      }

      .review-textarea-wrap {
        position: relative;
      }

      .review-char-counter {
        position: absolute;
        right: 12px;
        bottom: 8px;
        font-size: 12px;
        color: var(--color-neutral-60);
        pointer-events: none;
        background: transparent;
      }

      .review-image-slot {
        width: 72px;
        height: 72px;
        border-radius: var(--radius-md);
        border: 1px dashed var(--color-neutral-40);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background-color: var(--color-neutral-20);
        overflow: hidden;
        position: relative; /* để nút X neo đúng góc ảnh */
      }

      .review-image-row {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        gap: 6px; /* giảm khoảng cách giữa các ô ảnh */
        flex-wrap: wrap;
      }

      .review-image-options {
        margin-bottom: 6px;
      }

      .review-image-previews .review-image-slot {
        background: #fff;
      }

      .review-image-slot-upload {
        border-style: solid;
        border-color: rgba(0, 88, 159, 0.2);
        background: rgba(0, 88, 159, 0.03);
      }

      .review-image-slot-camera {
        border-style: solid;
        border-color: rgba(0, 88, 159, 0.35);
        background: rgba(0, 88, 159, 0.06);
      }

      .camera-slot-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 3px;
        color: var(--color-primary);
        font-size: 10px;
        font-weight: 700;
        line-height: 1.1;
      }

      .camera-slot-content .bi-camera-fill {
        font-size: 16px;
      }

      .camera-capture-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.55);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: calc(var(--z-modal) + 30);
      }

      .camera-capture-panel {
        width: min(560px, calc(100% - 28px));
        background: #fff;
        border-radius: 12px;
        border: 1px solid var(--color-neutral-30);
        padding: 12px;
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.25);
      }

      .camera-capture-title {
        font-size: 16px;
        font-weight: 700;
        color: var(--color-primary);
        margin-bottom: 10px;
      }

      .camera-video {
        width: 100%;
        max-height: 54vh;
        border-radius: 10px;
        background: #000;
        object-fit: cover;
      }

      .camera-actions {
        margin-top: 10px;
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }

      .review-image-slot img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .review-image-remove-btn {
        position: absolute;
        top: 4px;
        right: 4px;
        width: 18px;
        height: 18px;
        border: none;
        border-radius: 999px;
        background: rgba(0, 0, 0, 0.72);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        cursor: pointer;
        z-index: 3;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
      }

      .review-image-remove-btn .bi {
        font-size: 9px;
        line-height: 1;
      }

      .review-image-remove-btn:hover {
        background: rgba(220, 38, 38, 0.92);
      }

      .plus-icon {
        font-size: 24px;
        color: var(--color-neutral-60);
      }

      /* Stars use primary brand color instead of default yellow */
      .review-star-active {
        color: var(--color-primary);
      }

      .review-star-inactive {
        color: var(--color-neutral-50);
      }

      /* Buttons in footer */
      .review-btn-cancel,
      .review-btn-submit {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        padding: 10px 20px;
        min-height: 40px;
      }

      /* Hủy: nền trắng, viền xanh #00589F */
      .review-btn-cancel {
        background-color: var(--color-neutral-10);
        color: var(--color-primary);
        border: 1px solid var(--color-primary);
        min-width: 90px;
      }

      .review-btn-cancel:hover {
        background-color: var(--color-primary-bg);
      }

      /* Gửi đánh giá: nền xanh, viền trắng */
      .review-btn-submit {
        background-color: var(--color-primary);
        color: var(--color-text-inverse);
        border: 1px solid var(--color-neutral-10);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 2px;
        padding: 10px 18px;
        line-height: 1;
      }

      .review-btn-submit:hover:not(:disabled) {
        background-color: var(--color-primary-hover);
      }

      .review-btn-submit:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      /* Khung vùng đánh giá (sao + chữ "Đánh giá") */
      .review-rating-box {
        background: transparent;
        border: none;
        border-radius: 10px;
        padding: 0;
        margin-top: -4px;
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .rating-box-title {
        text-align: center;
        color: var(--color-neutral-60);
        font-weight: 600;
      }

      .review-stars-row {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        user-select: none;
        touch-action: pan-x; /* allow horizontal drag without browser gesture */
      }

      .review-star-icon {
        font-size: 36px;
        transition: transform 0.12s ease, opacity 0.12s ease;
        transform-origin: center;
        will-change: transform;
      }

      .review-star-icon:hover {
        transform: scale(1.22);
      }

      /* Không scale/“nhảy” khi rê chuột để chọn sao */

      .review-star-inactive {
        color: rgba(0, 0, 0, 0.18) !important;
      }

      .review-star-active {
        color: #fca120 !important;
      }

      .rating-box-label {
        margin-top: 2px;
        text-align: center;
        color: #fca120;
        font-weight: 700;
        font-size: 14px;
      }

      .review-btn-submit-title {
        display: block;
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
      }

      .review-btn-submit-xu {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        font-weight: 800;
        color: #ffcc00;
        background: transparent;
        border: none;
        border-radius: 0;
        padding: 0;
      }

      .review-btn-submit-xu .bi-coin {
        color: #ffcc00;
        font-size: 12px;
      }
    `,
  ],
})
export class ReviewFormComponent implements OnChanges {
  @Input() products: ReviewProduct[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() submit = new EventEmitter<ReviewProduct[]>();

  localProducts: ReviewProduct[] = [];
  @ViewChild('cameraVideo') cameraVideoRef?: ElementRef<HTMLVideoElement>;

  stars = [1, 2, 3, 4, 5];
  previewSlots = [0, 1, 2, 3, 4];

  private isDraggingRating: boolean = false;
  private ratingPointerId: number | null = null;
  private lastRatingValueByProductIndex: Record<number, number> = {};
  showCameraCaptureModal: boolean = false;
  private cameraStream: MediaStream | null = null;
  private cameraTargetProductIndex: number = -1;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['products']) {
      this.localProducts =
        (this.products || []).map((p) => {
          const images = ((p.images || []) as (string | null)[])
            .filter((img): img is string => !!img)
            .slice(0, this.previewSlots.length);
          return {
            ...p,
            rating: p.rating ?? 5,
            reviewText: p.reviewText ?? '',
            images,
          };
        }) ?? [];
      this.cdr.detectChanges();
    }
  }

  onClose(): void {
    this.close.emit();
  }

  setRating(productIndex: number, rating: number): void {
    if (!this.localProducts[productIndex]) return;
    this.localProducts[productIndex].rating = rating;
  }

  onStarHover(productIndex: number, rating: number): void {
    if (!this.localProducts[productIndex]) return;
    this.lastRatingValueByProductIndex[productIndex] = rating;
    this.localProducts[productIndex].rating = rating;
    this.cdr.detectChanges();
  }

  private calcRatingFromPointerEvent(event: PointerEvent, container: HTMLElement): number {
    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const width = rect.width || 1;
    const ratio = Math.max(0, Math.min(1, x / width));
    // Map 0..1 -> 1..5
    const value = Math.floor(ratio * 5) + 1;
    return Math.max(1, Math.min(5, value));
  }

  onRatingPointerDown(event: PointerEvent, productIndex: number): void {
    // Only handle primary button / touch
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const target = event.currentTarget as HTMLElement | null;
    if (!target) return;

    // Với touch/drag: cập nhật ngay tại lúc chạm
    event.preventDefault();

    const rating = this.calcRatingFromPointerEvent(event, target);
    const last = this.lastRatingValueByProductIndex[productIndex];
    if (last !== rating) {
      this.lastRatingValueByProductIndex[productIndex] = rating;
      this.setRating(productIndex, rating);
      this.cdr.detectChanges();
    }
  }

  onRatingPointerMove(event: PointerEvent, productIndex: number): void {
    const target = event.currentTarget as HTMLElement | null;
    if (!target) return;

    // Mouse hover cũng cập nhật rating theo vị trí (không cần nhấn)
    const rating = this.calcRatingFromPointerEvent(event, target);
    const last = this.lastRatingValueByProductIndex[productIndex];
    if (last !== rating) {
      this.lastRatingValueByProductIndex[productIndex] = rating;
      this.setRating(productIndex, rating);
      this.cdr.detectChanges();
    }
  }

  onRatingPointerUp(event: PointerEvent, productIndex: number): void {
    // No-op (đã cập nhật theo hover/move)
    event.preventDefault();
  }

  getRatingLabel(rating?: number | null): string {
    const r = rating || 0;
    if (r >= 5) return 'Rất hài lòng';
    if (r === 4) return 'Hài lòng';
    if (r === 3) return 'Bình thường';
    if (r === 2) return 'Không hài lòng';
    if (r === 1) return 'Rất tệ';
    return '';
  }

  async onOptionFileSelected(event: Event, productIndex: number): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }
    const file = input.files[0];
    // Nén ảnh trước khi gửi để tránh vượt giới hạn 16MB/document của MongoDB
    const base64 = await this.fileToBase64(file);

    this.appendImageToNextSlot(productIndex, base64);

    input.value = '';
    // Force detect để ảnh hiển thị ngay
    this.cdr.detectChanges();
  }

  async onCameraOptionClick(
    event: Event,
    productIndex: number,
    cameraInput: HTMLInputElement
  ): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    if (this.getCurrentImageCount(productIndex) >= this.previewSlots.length) return;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      cameraInput.click();
      return;
    }

    const ua = (navigator.userAgent || '').toLowerCase();
    const isMobile = /android|iphone|ipad|ipod|mobile/.test(ua);
    if (isMobile) {
      cameraInput.click();
      return;
    }

    this.cameraTargetProductIndex = productIndex;
    try {
      this.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' as any },
        audio: false,
      });
      this.showCameraCaptureModal = true;
      this.cdr.detectChanges();
      setTimeout(() => {
        const video = this.cameraVideoRef?.nativeElement;
        if (video && this.cameraStream) {
          video.srcObject = this.cameraStream;
          video.play().catch(() => {});
        }
      }, 0);
    } catch {
      this.showCameraCaptureModal = false;
      this.stopCameraStream();
    }
  }

  captureFromCamera(): void {
    const video = this.cameraVideoRef?.nativeElement;
    if (!video) return;

    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const base64 = canvas.toDataURL('image/jpeg', 0.7);

    const pIndex = this.cameraTargetProductIndex;
    this.appendImageToNextSlot(pIndex, base64);

    this.closeCameraCaptureModal();
    this.cdr.detectChanges();
  }

  closeCameraCaptureModal(): void {
    this.showCameraCaptureModal = false;
    this.stopCameraStream();
  }

  private stopCameraStream(): void {
    if (!this.cameraStream) return;
    this.cameraStream.getTracks().forEach((t) => t.stop());
    this.cameraStream = null;
  }

  private getCurrentImageCount(productIndex: number): number {
    const imgs = this.localProducts[productIndex]?.images || [];
    return imgs.filter((img): img is string => !!img).length;
  }

  private appendImageToNextSlot(productIndex: number, base64: string): void {
    if (!this.localProducts[productIndex] || !base64) return;
    const product = this.localProducts[productIndex];
    const imgs = (product.images || []).filter((img): img is string => !!img);
    if (imgs.length >= this.previewSlots.length) return;
    product.images = [...imgs, base64];
  }

  getPreviewImage(productIndex: number, slotIndex: number): string | null {
    const imgs = this.localProducts[productIndex]?.images || [];
    return (imgs[slotIndex] as string) || null;
  }

  removePreviewImage(event: Event, productIndex: number, slotIndex: number): void {
    event.preventDefault();
    event.stopPropagation();
    const product = this.localProducts[productIndex];
    if (!product?.images || slotIndex < 0 || slotIndex >= product.images.length) return;
    product.images.splice(slotIndex, 1);
    this.cdr.detectChanges();
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = typeof reader.result === 'string' ? reader.result : '';
        if (!dataUrl) {
          resolve('');
          return;
        }

        const img = new Image();
        img.onload = () => {
          try {
            const maxSide = 640; // giảm mạnh dung lượng nhưng vẫn đủ xem
            const ratio = Math.min(1, maxSide / Math.max(img.width, img.height));
            const targetW = Math.max(1, Math.round(img.width * ratio));
            const targetH = Math.max(1, Math.round(img.height * ratio));

            const canvas = document.createElement('canvas');
            canvas.width = targetW;
            canvas.height = targetH;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(dataUrl);
              return;
            }

            ctx.drawImage(img, 0, 0, targetW, targetH);

            // Ưu tiên JPEG để giảm kích thước payload base64
            const compressed = canvas.toDataURL('image/jpeg', 0.6);
            resolve(compressed || dataUrl);
          } catch {
            resolve(dataUrl);
          }
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  canSubmit(): boolean {
    if (this.localProducts.length === 0) return false;
    return this.localProducts.every((p) => !!p.rating && p.rating > 0);
  }

  onSubmitClicked(): void {
    if (!this.canSubmit()) return;
    this.submit.emit(this.localProducts);
  }
}
