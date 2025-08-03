import { Type } from 'class-transformer';
import {
  IsNumber, IsOptional, Max, Min 
} from 'class-validator';

import { IPaginationParamReq } from '../interfaces/pagination.interface';

export class PaginationDto implements IPaginationParamReq {
  @IsNumber()
  @IsOptional()
  @Min( 0 )
  @Type( () => Number )
  public readonly page?: number;

  @IsNumber()
  @IsOptional()
  @Min( 1 )
  @Max( 500 )
  @Type( () => Number )
  public readonly perPage?: number;
}
