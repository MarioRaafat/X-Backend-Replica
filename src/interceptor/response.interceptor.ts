import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RESPONSE_MESSAGE_KEY } from 'src/decorators/response-message.decorator';

export interface Response<T> {
    data: T;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
    constructor(private reflector: Reflector) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
        const custom_message = this.reflector.get<string>(
            RESPONSE_MESSAGE_KEY,
            context.getHandler()
        );
        return next.handle().pipe(
            map((data) => ({
                data,
                count: Array.isArray(data) ? data.length : data ? 1 : 0,
                message: custom_message || 'Success',
            }))
        );
    }
}
