export interface CustomerStats {
    totalCustomers: number;
    customerSpending: CustomerSpending[];
    topCustomersBySpending: TopCustomerBySpending[];
    topCustomersByOrders: TopCustomerByOrders[];
  }
  
  export interface CustomerSpending {
    id: string;
    fullName: string;
    totalSpending: number;
  }
  
  export interface TopCustomerBySpending {
    id: string;
    fullName: string;
    email: string | null;
    totalSpending: number;
  }
  
  export interface TopCustomerByOrders {
    id: string;
    fullName: string;
    orderCount: number;
  }