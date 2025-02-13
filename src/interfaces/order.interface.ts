import { Order } from "@prisma/client";

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