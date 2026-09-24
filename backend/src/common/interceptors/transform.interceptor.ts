import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  data: T;
  message?: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map((res) => {
        // If already formatted with success property, pass through
        if (res && typeof res === 'object' && 'success' in res) {
          return res;
        }
        return {
          success: true,
          data: res,
          message: 'Operation completed successfully',
        };
      }),
    );
  }
}