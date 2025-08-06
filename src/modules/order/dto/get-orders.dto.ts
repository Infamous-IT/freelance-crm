import { IsOptional, IsString, IsEnum } from 'class-validator';
import { Category, OrderStatus } from '@prisma/client';
import { GetOrder } from '../interfaces/order.interface';

export class GetOrdersDto implements GetOrder {
  @IsOptional()
  @IsString()
  searchText?: string;

  @IsOptional()
  orderBy?: {
    field: string;
    sorting: 'asc' | 'desc';
  };

  @IsOptional()
  @IsEnum(Category)
  category?: Category;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}