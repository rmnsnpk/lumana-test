import { ApiErrorResponse } from '../interfaces/api-error-response.interface';

export const isApiErrorResponse = (body: unknown): body is ApiErrorResponse =>
  typeof body === 'object' && body !== null && 'error' in body;
