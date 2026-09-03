export type ApiSuccess<T> = { success: true } & T;

export interface ApiError {
  success: false;
  error: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
