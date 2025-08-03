export interface OrderStats {
    totalOrders: number;
    totalEarnings: number;
    topExpensiveOrders: TopExpensiveOrder[];
  }
  
  export interface TopExpensiveOrder {
    id: string;
    title: string;
    price: number;
  }