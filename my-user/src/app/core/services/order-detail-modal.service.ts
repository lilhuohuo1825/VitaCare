import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class OrderDetailModalService {
    private modalOrderNumber: string | null = null;
    private isOpen = false;

    openModal(orderNumber: string): void {
        this.modalOrderNumber = orderNumber;
        this.isOpen = true;
        console.log('Opening order detail modal for:', orderNumber);
        // TODO: Implement actual modal opening logic
    }

    closeModal(): void {
        this.modalOrderNumber = null;
        this.isOpen = false;
    }

    getOrderNumber(): string | null {
        return this.modalOrderNumber;
    }

    isModalOpen(): boolean {
        return this.isOpen;
    }
}
