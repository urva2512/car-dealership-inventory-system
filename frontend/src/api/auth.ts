import { apiRequest } from './client';
import type { Session, User } from '../types';

export interface AuthInput {
  name?: string;
  email: string;
  password: string;
}

export function register(input: Required<AuthInput>): Promise<Session> {
  return apiRequest<Session>('/auth/register', { method: 'POST', body: input });
}

export function login(input: Omit<AuthInput, 'name'>): Promise<Session> {
  return apiRequest<Session>('/auth/login', { method: 'POST', body: input });
}

export function createAdmin(input: Required<AuthInput>, token: string): Promise<User> {
  return apiRequest<User>('/auth/admin', { method: 'POST', body: input, token });
}
