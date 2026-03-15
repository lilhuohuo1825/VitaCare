import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const API = '/api';

export interface UpdateProfilePayload {
  user_id: string;
  full_name?: string;
  email?: string;
  birthday?: string | null;
  gender?: string;
  avatar?: string | null;
}

export interface SendOtpAnyResponse {
  success: boolean;
  message?: string;
  otp?: string;
  phone?: string;
}

export interface VerifyOtpAnyPayload {
  phone: string;
  otp: string;
}

export interface UpdatePhonePayload {
  user_id: string;
  new_phone: string;
  otp: string;
}

export interface UserMeResponse {
  success: boolean;
  message?: string;
  user?: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class InfoApiService {
  constructor(private http: HttpClient) {}

  updateProfile(payload: UpdateProfilePayload): Observable<UserMeResponse> {
    return this.http.patch<UserMeResponse>(`${API}/users/me`, payload);
  }

  sendOtpAny(phone: string): Observable<SendOtpAnyResponse> {
    return this.http.post<SendOtpAnyResponse>(`${API}/auth/send-otp-any`, { phone });
  }

  verifyOtpAny(payload: VerifyOtpAnyPayload): Observable<{ success: boolean; message?: string }> {
    return this.http.post<{ success: boolean; message?: string }>(`${API}/auth/verify-otp-any`, payload);
  }

  updatePhone(payload: UpdatePhonePayload): Observable<UserMeResponse> {
    return this.http.patch<UserMeResponse>(`${API}/users/me/phone`, payload);
  }
}
