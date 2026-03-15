import { Injectable, NgZone } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CartAnimationService {
  private cartTargetSelector = '.vc_action_cart .vc_action_icon';
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

      pill.style.left = `${startX}px`;
      pill.style.top = `${startY}px`;
      document.body.appendChild(pill);

      const endX = targetRect.left + targetRect.width / 2;
      const endY = targetRect.top + targetRect.height / 2;

      const dx = endX - startX;
      const dy = endY - startY;

      requestAnimationFrame(() => {
        pill.style.setProperty('--fly-dx', `${dx}px`);
        pill.style.setProperty('--fly-dy', `${dy}px`);
        pill.classList.add('vc-fly-pill--active');
      });

      const onEnd = () => {
        pill.removeEventListener('animationend', onEnd);
        pill.remove();
        this.pulseCartBadge(isMobile);
      };
      pill.addEventListener('animationend', onEnd);

      setTimeout(() => pill.remove(), 1800);
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
