import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ReviewSyncService {
    private ordersChangedSubject = new Subject<void>();
    public ordersChanged$ = this.ordersChangedSubject.asObservable();

    notifyOrdersChanged(): void {
        this.ordersChangedSubject.next();
    }
}
