import { IsOptional, IsString, IsEnum } from 'class-validator';
import { Role } from '@prisma/client';
import { GetUsers } from '../interfaces/user.interface';

export class GetUsersDto implements GetUsers {
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
