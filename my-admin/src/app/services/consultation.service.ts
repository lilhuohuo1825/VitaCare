import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ConsultationService {
    private apiUrl = 'http://localhost:3000/api/admin';

    constructor(private http: HttpClient) { }

    getProductConsultations(): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/consultations_product`);
    }

    getProductConsultationsByRole(role?: string, pharmacistId?: string, pharmacistEmail?: string, pharmacistName?: string): Observable<any> {
        const query = new URLSearchParams();
        if (role) query.set('role', role);
        if (pharmacistId) query.set('pharmacistId', pharmacistId);
        if (pharmacistEmail) query.set('pharmacistEmail', pharmacistEmail);
        if (pharmacistName) query.set('pharmacistName', pharmacistName);
        const qs = query.toString();
        return this.http.get<any>(`${this.apiUrl}/consultations_product${qs ? `?${qs}` : ''}`);
    }

    getProductConsultationStats(): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/consultations_product/stats`);
    }

    getProductConsultationStatsByRole(role?: string, pharmacistId?: string, pharmacistEmail?: string, pharmacistName?: string): Observable<any> {
        const query = new URLSearchParams();
        if (role) query.set('role', role);
        if (pharmacistId) query.set('pharmacistId', pharmacistId);
        if (pharmacistEmail) query.set('pharmacistEmail', pharmacistEmail);
        if (pharmacistName) query.set('pharmacistName', pharmacistName);
        const qs = query.toString();
        return this.http.get<any>(`${this.apiUrl}/consultations_product/stats${qs ? `?${qs}` : ''}`);
    }

    getPrescriptionConsultations(): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/consultations_prescription`);
    }

    getPrescriptionConsultationsByRole(role?: string, pharmacistId?: string): Observable<any> {
        const query = new URLSearchParams();
        if (role) query.set('role', role);
        if (pharmacistId) query.set('pharmacistId', pharmacistId);
        const qs = query.toString();
        return this.http.get<any>(`${this.apiUrl}/consultations_prescription${qs ? `?${qs}` : ''}`);
    }

    updatePrescription(id: string, data: any): Observable<any> {
        return this.http.patch<any>(`${this.apiUrl}/consultations_prescription/${id}`, data);
    }

    replyProductQuestion(data: {
        sku: string,
        questionId: string,
        answer: string,
        answeredBy?: string,
        assignedPharmacistId?: string,
        assignedBy?: string,
        actorRole?: string
    }): Observable<any> {
        return this.http.patch<any>(`${this.apiUrl}/consultations_product/reply`, data);
    }

    getPharmacists(): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/pharmacists`);
    }

    deletePrescriptionConsultation(id: string): Observable<any> {
        return this.http.delete<any>(`${this.apiUrl}/consultations_prescription/${id}`);
    }

    deleteProductConsultation(sku: string, questionId: string): Observable<any> {
        return this.http.delete<any>(`${this.apiUrl}/consultations_product/${sku}/${questionId}`);
    }

    getDiseaseConsultations(): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/consultations_disease`);
    }

    getDiseaseConsultationStats(): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/consultations_disease/stats`);
    }

    replyDiseaseQuestion(data: { sku: string, questionId: string, answer: string, answeredBy: string }): Observable<any> {
        return this.http.patch<any>(`${this.apiUrl}/consultations_disease/reply`, data);
    }

    deleteDiseaseConsultation(sku: string, questionId: string): Observable<any> {
        return this.http.delete<any>(`${this.apiUrl}/consultations_disease/${sku}/${questionId}`);
    }
}
