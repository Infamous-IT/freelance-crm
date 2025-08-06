import { Type } from 'class-transformer';
import { IsOptional, IsEnum, IsString, ValidateNested } from 'class-validator';
import { Category, OrderStatus } from '@prisma/client';
import { PaginationDto } from 'src/common/pagination/dtos/pagination.dto';
import { OrderOrderBy, OrderQuerySearchParams } from '../interfaces/order.interface';

export class OrderOrderByDto implements OrderOrderBy {
  @IsString()
  field: string;

  @IsString()
  sorting: 'asc' | 'desc';
}

export class OrderQuerySearchParamsDto extends PaginationDto implements OrderQuerySearchParams {
  @IsOptional()
  @IsString()
  searchText?: string;

  @IsOptional()
  @IsEnum(Category)
  category?: Category;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @ValidateNested()
  @Type(() => OrderOrderByDto)
  orderBy?: OrderOrderByDto;
}