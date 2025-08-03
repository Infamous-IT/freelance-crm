import { IsOptional, IsString } from 'class-validator';

export class GetCustomersDto {
  @IsOptional()
  @IsString()
  searchText?: string;

  @IsOptional()
  orderBy?: {
    field: string;
    sorting: 'asc' | 'desc';
  };

  @IsOptional()
  @IsString()
  company?: string;
}
