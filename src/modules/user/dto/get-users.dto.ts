import { IsOptional, IsString, IsEnum } from 'class-validator';
import { Role } from '@prisma/client';

export class GetUsersDto {
  @IsOptional()
  @IsString()
  searchText?: string;

  @IsOptional()
  orderBy?: {
    field: string;
    sorting: 'asc' | 'desc';
  };

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsString()
  country?: string;
}
