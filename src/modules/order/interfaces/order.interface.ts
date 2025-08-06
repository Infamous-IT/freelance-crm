import { Category, Order, OrderStatus, Role } from '@prisma/client';

export interface PaginatedOrders {
  data: Order[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export interface OrderStats {
  totalOrders: number;
  totalEarnings: number;
}

export interface TopExpensiveOrder {
  id: string;
  title: string;
  price: number;
}

export interface CreateOrder {
  title: string;
  description: string;
  price: number;
  startDate: string;
  endDate: string;
  category: Category;
  status: OrderStatus;
  customerId?: string;
}

export interface GetOrder {
  searchText?: string;
  orderBy?: {
    field: string;
    sorting: 'asc' | 'desc';
  };
  category?: Category;
  status?: OrderStatus;
}

export interface OrderOrderBy {
  field: string;
  sorting: 'asc' | 'desc';
}

export interface OrderQuerySearchParams {
  searchText?: string;
  category?: Category;
  status?: OrderStatus;
  orderBy?: OrderOrderBy;
}

export interface OrderQuery {
  userId: string;
  userRole: Role;
}