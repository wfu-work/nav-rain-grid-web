import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface SystemAccountProfile {
  id?: number;
  guid?: string;
  username?: string;
  name?: string;
  nickName?: string;
  avatar?: string;
  email?: string;
  phone?: string;
  status?: number;
  enable?: number;
  roleCodeList?: string[];
  createTime?: number;
  create_time?: number;
  updateTime?: number;
  update_time?: number;
}

export interface ChangePasswordPayload {
  oldPassword: string;
  newPassword: string;
}

@Injectable({ providedIn: 'root' })
export class SystemAccountService {
  private readonly http = inject(HttpClient);

  profile(): Observable<SystemAccountProfile> {
    return this.http.get<SystemAccountProfile>('/user/token');
  }

  encryptSecret(value: string): Observable<string> {
    return this.http.post<string>('/secret/encrypt', value);
  }

  changePassword(payload: ChangePasswordPayload): Observable<boolean> {
    return this.http.put<boolean>('/user/update/password', payload);
  }
}
