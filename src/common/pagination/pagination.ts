import { DEFAULT_ELEMENTS_PER_PAGE, DEFAULT_PAGE } from './constants/pagination.consts';

export function pagination(
  index?: number,
  size?: number
): { page: number; perPage: number } {
  const defaultSize = DEFAULT_ELEMENTS_PER_PAGE;

  const page = index ?? DEFAULT_PAGE;
  const perPage = size ?? defaultSize;
  
  return {
    page: Number( page ),
    perPage: Number( perPage )
  };
}
