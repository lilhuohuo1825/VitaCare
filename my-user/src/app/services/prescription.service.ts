export interface Prescription {
    _id: string;
    prescriptionId: string;
    user_id: string;
    full_name: string;
    phone: string;
    note: string;
    consultation_type: string;
    images: string[];
    medicines_requested: string[];
    status: 'pending' | 'waiting' | 'advised' | 'unreachable' | 'cancelled';
    current_status: {
        status: string;
        changedAt: string;
        changedBy: string;
    };
    status_history: any[];
    pharmacist_id?: string;
    pharmacistName?: string;
    pharmacistPhone?: string;
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
    cancel_reason?: string;
    is_follow_up: boolean;
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class PrescriptionService {
    private http = inject(HttpClient);
    private apiUrl = 'http://localhost:3000/api/prescriptions';

    getPrescriptions(userId: string): Observable<{ success: boolean; items: Prescription[]; message?: string }> {
        return this.http.get<{ success: boolean; items: Prescription[]; message?: string }>(`${this.apiUrl}?user_id=${userId}`)
            .pipe(
                catchError(err => {
                    console.error('PrescriptionService Error:', err);
                    return of({ success: false, items: [], message: err.message });
                })
            );
    }
}
