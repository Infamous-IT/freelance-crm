import { IsOptional, IsString } from 'class-validator';
import { GetCustomer } from '../interfaces/customer.interface';

export class GetCustomersDto implements GetCustomer {
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
