import {
    ClassConstructor,
    ClassTransformOptions,
    instanceToPlain,
    plainToInstance
  } from 'class-transformer';
  
  
  export abstract class AbstractController {
  
    transformToArray<T extends R, R>(
      data: T[],
      type: ClassConstructor<R>
    ): Record<string, any>[] {
      return data.map( ( item: T ) => {
        return this.transformToObject( item, type );
      });
    }
  
    public transformToObject<T extends R, R>(
      item: T,
      type: ClassConstructor<R>,
      options: ClassTransformOptions = {
        strategy: 'excludeAll'
      }
    ): Record<string, any> {
      const objectTransformed = plainToInstance( type, item as R, {
        strategy: 'exposeAll'
      });
      return instanceToPlain( objectTransformed, options );
    }
  
    public transformToObjectUnsafe<T extends R, R>(
      item: T,
      type: ClassConstructor<R>,
      options: ClassTransformOptions = {
        strategy: 'exposeAll'
      }
    ): Record<string, any> {
      const objectTransformed = plainToInstance( type, item as R, {
        strategy: 'exposeAll'
      });
      return instanceToPlain( objectTransformed, options );
    }
  }
  