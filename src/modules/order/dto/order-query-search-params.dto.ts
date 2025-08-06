import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsEnum, IsString, ValidateNested } from 'class-validator';
import { Category, OrderStatus } from '@prisma/client';
import { PaginationDto } from 'src/common/pagination/dtos/pagination.dto';

export class OrderOrderByDto {
  @IsString()
  field: string;

  @IsString()
  sorting: 'asc' | 'desc';
}

export class OrderQuerySearchParamsDto extends PaginationDto {
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