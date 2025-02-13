export interface PaginatedResult<T> {
    data: T[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
}


export interface CustomerStats {
  totalCustomers: number;
}

export interface CustomerSpending {
  id: string;
  fullName: string;
  totalSpending: number;
}

export interface TopCustomerByOrders {
  id: string;
  fullName: string;
  _count: { order: number };
}

export interface TopCustomerBySpending {
  id: string;
  fullName: string;
  email: string | null;
  totalSpending: number;
}
