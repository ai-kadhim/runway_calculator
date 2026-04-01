export interface Employee {
  id: string;
  name: string;
  role: string;
  monthlySalaryUsd: number;
  startDate: string;
  country: string;
  deelContractType: "full-time" | "contractor";
  deelFeeMonthly: number; // Deel platform fee per employee
}

export interface Trip {
  id: string;
  description: string;
  destination: string;
  startDate: string;
  endDate: string;
  flights: number;
  hotels: number;
  perDiem: number;
  otherCosts: number;
}

export interface Expense {
  id: string;
  date: string;
  description: string;
  category: ExpenseCategory;
  amount: number;
  vendor: string;
  source: "manual" | "brex";
}

export type ExpenseCategory =
  | "software"
  | "cloud"
  | "office"
  | "travel"
  | "meals"
  | "equipment"
  | "marketing"
  | "legal"
  | "deel"
  | "payroll"
  | "other";

export type RevenueFrequency = "monthly" | "quarterly" | "annual" | "one-time";

export interface Revenue {
  id: string;
  date: string;
  description: string;
  amount: number;
  client: string;
  frequency: RevenueFrequency;
}

export interface RunwayState {
  companyName: string;
  cashOnHand: number;
  monthlyRevenue: number;
  monthlyOfficeCost: number;
  employees: Employee[];
  trips: Trip[];
  expenses: Expense[];
  revenues: Revenue[];
}

export interface RunwayCalculation {
  totalMonthlyBurn: number;
  totalMonthlyRevenue: number;
  monthlyPayroll: number;
  monthlyDeelFees: number;
  monthlyOfficeCosts: number;
  monthlyTripsCost: number;
  monthlyExpenses: number;
  expensesByCategory: Record<ExpenseCategory, number>; // monthly amount per category
  netBurn: number; // burn minus revenue
  runwayMonths: number;
  runwayDate: string; // estimated date cash runs out
}
