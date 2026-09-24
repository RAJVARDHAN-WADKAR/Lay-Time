export class ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export class ApiErrorResponse {
  success: boolean;
  message: string;
  errorCode: string;
  timestamp: string;
  path: string;
}