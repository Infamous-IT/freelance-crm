import {
    CallHandler, ExecutionContext, Injectable, NestInterceptor 
} from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { IDataResponse } from '../interfaces/app.interface';



@Injectable()
export class TransformInterceptor<T> implements NestInterceptor {
intercept( context: ExecutionContext, next: CallHandler ): Observable<any> {
    return next.handle().pipe(
    map( ( data: IDataResponse<T> ) => {
        return {
        data: data
        };
    })
    );
}
}
  