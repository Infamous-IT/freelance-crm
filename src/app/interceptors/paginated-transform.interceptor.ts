import {
    BadRequestException,
    CallHandler,
    ExecutionContext,
    NestInterceptor
  } from '@nestjs/common';
  import {
    ClassConstructor,
    ClassTransformOptions,
    instanceToPlain,
    plainToInstance
  } from 'class-transformer';
  import { map, Observable } from 'rxjs';
  
  export class PaginatedTransformInterceptor<T> implements NestInterceptor {
    constructor( private readonly classType: ClassConstructor<T> ) {
    }
  
    intercept( context: ExecutionContext, next: CallHandler ): Observable<any> {
      return next.handle().pipe(
        map( ( response ) => {
          if (
            !Array.isArray( response.data )
          ) {
            throw new BadRequestException(
              'Response format is invalid. Expected { data: T[], meta: PaginationResponse }'
            );
          }
  
          const transformedData = this.transformToArray( response.data, this.classType );
  
          return {
            data: transformedData, meta: response.meta
          };
        })
      );
    }
  
    public transformToObject<T, R>(
      item: T,
      type: ClassConstructor<R>,
      options: ClassTransformOptions = {
        strategy: 'excludeAll'
      }
    ): Record<string, any> {
      const objectTransformed = plainToInstance( type, item, {
        strategy: 'exposeAll'
      });
      return instanceToPlain( objectTransformed, options );
    }
  
    public transformToArray<T, R>(
      data: T[],
      type: ClassConstructor<R>
    ): Record<string, any>[] {
      return data.map( ( item: T ) => {
        return this.transformToObject( item, type );
      });
    }
  }
  