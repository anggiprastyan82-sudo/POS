export interface Category {
  id: number;
  name: string;
}

export interface Product {
  id: number;
  name: string;
  category_id: number;
  category_name?: string;
  cost_price: number;
  selling_price: number;
  stock: number;
  image_url?: string;
}

export interface Expense {
  id: number;
  description: string;
  amount: number;
  date: string;
}

export interface PaymentMethod {
  id: number;
  name: string;
}

export interface Sale {
  id: number;
  total_amount: number;
  payment_method_id: number;
  payment_method_name?: string;
  date: string;
}

export interface SaleItem {
  product_id: number;
  quantity: number;
  price: number;
  name?: string;
}

export interface DashboardData {
  sales: { day: string; total: number }[];
  expenses: { day: string; total: number }[];
  topProducts: { name: string; sold: number }[];
}

export interface Settings {
  business_name: string;
  printer_name?: string;
}
