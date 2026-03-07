import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ChatTurn {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface ChatResponse {
  success: boolean;
  reply?: string;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private http = inject(HttpClient);
  private apiBase = '/api';

  sendMessage(message: string, history: ChatTurn[] = []): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.apiBase}/chat`, { message, history });
  }
}
