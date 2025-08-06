import { User } from '@prisma/client';
import { OmitTyped } from 'src/app/interfaces/app.interface';

export interface PaginatedUsers {
  data: User[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export type UserSecureData = OmitTyped<User, 'password'>;