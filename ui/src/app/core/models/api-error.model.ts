export interface ApiError {
  error: string;
  details?: any;
}

export interface ListResponse<T> {
  items: T[];
  total: number;
}
