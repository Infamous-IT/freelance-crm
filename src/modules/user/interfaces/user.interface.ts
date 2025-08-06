import { Role, User } from '@prisma/client';
import { OmitTyped } from 'src/app/interfaces/app.interface';

export interface PaginatedUsers {
  data: User[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export type UserSecureData = OmitTyped<User, 'password'>;

export interface CreateUser {
  firstName: string;
  lastName: string;
  country: string | null;
  email: string;
  password: string;
  isEmailVerified?: boolean | null;
  createdAt: Date;
  updatedAt: Date;
  role: Role;
}

export interface GetUsers {
  searchText?: string;
  orderBy?: {
    field: string;
    sorting: 'asc' | 'desc';
  }
  role?: Role;
  country?: string;
}