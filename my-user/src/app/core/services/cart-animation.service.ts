import { Injectable, NgZone } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CartAnimationService {
  private cartTargetSelector = '.vc_action_cart .vc_action_icon i.bi-basket2-fill';
  private mobileCartTargetSelector = '.vc_m_right .vc_m_icon_btn[aria-label="Giỏ thuốc"]';

  constructor(private zone: NgZone) {}

  /**
   * Animate a small pill flying from the source element to the cart icon in the header.
   * @param sourceEl The button element that was clicked (or any HTMLElement as origin)
   */
  flyToCart(sourceEl: HTMLElement): void {
    this.zone.runOutsideAngular(() => {
      const isMobile = window.innerWidth < 768;
      const targetEl = document.querySelector(
        isMobile ? this.mobileCartTargetSelector : this.cartTargetSelector
      ) as HTMLElement | null;

      if (!targetEl) return;

      const sourceRect = sourceEl.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();

      const pill = document.createElement('div');
      pill.className = 'vc-fly-pill';
      pill.innerHTML = '<i class="bi bi-capsule"></i>';

      const startX = sourceRect.left + sourceRect.width / 2;
      const startY = sourceRect.top + sourceRect.height / 2;

      const endX = targetRect.left + targetRect.width / 2;
      const endY = targetRect.top + targetRect.height / 2;

      // Single smooth curve (quadratic bezier): start -> control -> end
      const controlX = (startX + endX) / 2;
      const controlY = Math.min(startY, endY) - Math.max(120, Math.abs(endY - startY) * 0.35);
      const curvePath = `path("M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}")`;

      pill.style.setProperty('offset-path', curvePath);
      pill.style.setProperty('offset-distance', '0%');
      pill.style.setProperty('offset-rotate', '0deg');
      document.body.appendChild(pill);

      requestAnimationFrame(() => {
        pill.classList.add('vc-fly-pill--active');
      });

      const onEnd = () => {
        pill.removeEventListener('animationend', onEnd);
        pill.remove();
        this.pulseCartBadge(isMobile);
      };
      pill.addEventListener('animationend', onEnd);

      // Keep fallback timeout longer than CSS animation duration
      setTimeout(() => pill.remove(), 4200);
    });
  }

  private pulseCartBadge(isMobile: boolean): void {
    const badge = document.querySelector(
      isMobile ? '.vc_m_badge' : '.vc_badge'
    ) as HTMLElement | null;
    if (!badge) return;

    badge.classList.remove('vc-badge-pulse');
    void badge.offsetWidth;
    badge.classList.add('vc-badge-pulse');

    setTimeout(() => badge.classList.remove('vc-badge-pulse'), 500);
  }
}
