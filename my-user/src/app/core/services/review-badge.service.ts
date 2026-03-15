import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class ReviewBadgeService {
    private unreviewedCount = 0;

    setUnreviewedCount(count: number): void {
        this.unreviewedCount = count;
        console.log('Unreviewed count set to:', count);
    }

    getUnreviewedCount(): number {
        return this.unreviewedCount;
    }
}
