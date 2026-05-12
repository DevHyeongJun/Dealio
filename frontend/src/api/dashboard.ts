import { api } from './client';

export interface RevenueAgg {
  salesTotal: number;
  salesPaid: number;
  salesUnpaid: number;
  outsourcingTotal: number;
  outsourcingPaid: number;
  outsourcingUnpaid: number;
  netTotal: number;
  netPaid: number;
}

export interface MonthlyPoint {
  month: number;
  salesPaid: number;
  salesUnpaid: number;
  outsourcingPaid: number;
  outsourcingUnpaid: number;
  net: number;
  expense: number;
  salesPaidCum: number;
  salesUnpaidCum: number;
  salesTotalCum: number;
  outsourcingPaidCum: number;
  outsourcingUnpaidCum: number;
  outsourcingTotalCum: number;
  netCum: number;
  expenseCum: number;
  cashInCum: number;
  cashOutCum: number;
  salesMinusExpenseCum: number;
  netMinusExpenseCum: number;
}

export interface TopCustomer {
  customerId: string | null;
  name: string;
  totalAmount: number;
  paidAmount: number;
  count: number;
}

export type RecentActivityType =
  | 'QUOTATION_CREATED'
  | 'QUOTATION_SENT'
  | 'CONTRACT_CREATED'
  | 'EXPENSE_CREATED';

export interface RecentActivity {
  type: RecentActivityType;
  at: string;
  title: string;
  subtitle: string | null;
  link: string;
}

export interface ExpiringQuotation {
  id: string;
  quotationNumber: string;
  title: string | null;
  customerName: string;
  validUntil: string;
  totalAmount: number;
}

export interface DashboardResponse {
  year: number;
  generatedAt: string;
  revenue: RevenueAgg;
  monthly: MonthlyPoint[];
  topCustomers: TopCustomer[];
  expenseTotal: number;
  expenseByCategory: Record<string, number>;
  quotationStatusCounts: Record<string, number>;
  expiringQuotations: ExpiringQuotation[];
  recentActivity: RecentActivity[];
}

export const dashboardApi = {
  get: (year?: number) => {
    const qs = year ? `?year=${year}` : '';
    return api.get<DashboardResponse>(`/dashboard${qs}`);
  },
};
