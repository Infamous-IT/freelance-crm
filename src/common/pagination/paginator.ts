import { DEFAULT_ELEMENTS_PER_PAGE } from './constants/pagination.consts';
import { DEFAULT_PAGE } from './constants/pagination.consts';

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number
    lastPage: number
    currentPage: number
    perPage: number
    prev: number | null
    next: number | null
  };
}

export type PaginationMeta = Pick<PaginatedResult<any>, 'meta'>['meta'];
export type PaginateOptions = { page?: number | string, perPage?: number | string }
export type PaginateFunction = <T, K>(
  model: any,
  args?: K,
  options?: PaginateOptions
) => Promise<PaginatedResult<T>>

export const paginator = ( defaultOptions: PaginateOptions ): PaginateFunction => {
  return async ( model, args: any = {
    where: undefined, distinct: undefined
  }, options ) => {
    const page = Number( options?.page || defaultOptions?.page ) || DEFAULT_PAGE;
    const perPage = 
      Number( options?.perPage || defaultOptions?.perPage ) || DEFAULT_ELEMENTS_PER_PAGE;

    const skip = page > 0 ? perPage * ( page - 1 ) : 0;

    let countQuery = model.count({ where: args.where });

    if ( args.distinct ) {
      countQuery = model.findMany({
        ...args
      }).then( ( data: any[] ) => data.length );
    }

    const [
      total,
      data
    ] = await Promise.all( [
      countQuery,
      model.findMany({
        ...args,
        take: perPage,
        skip
      })
    ] );
    const lastPage = Math.ceil( total / perPage );

    return {
      data,
      meta: {
        total,
        lastPage,
        currentPage: page,
        perPage,
        prev: page > 1 ? page - 1 : null,
        next: page < lastPage ? page + 1 : null
      }
    };
  };
};

export const paginate: PaginateFunction = paginator({
  page: DEFAULT_PAGE, perPage: DEFAULT_ELEMENTS_PER_PAGE
});
