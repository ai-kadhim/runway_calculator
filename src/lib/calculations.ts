import type { RunwayState, RunwayCalculation, ExpenseCategory } from "@/types";

export function calculateRunway(state: RunwayState): RunwayCalculation {
  const { cashOnHand, monthlyRevenue, monthlyOfficeCost, employees, trips, expenses, revenues } =
    state;

  // --- Payroll ---
  const monthlyPayroll = employees.reduce(
    (sum, emp) => sum + emp.monthlySalaryUsd,
    0,
  );

  // --- Deel fees ---
  const monthlyDeelFees = employees.reduce(
    (sum, emp) => sum + emp.deelFeeMonthly,
    0,
  );

  // --- Office costs ---
  const monthlyOfficeCosts = monthlyOfficeCost;

  // --- Trips (amortized to monthly) ---
  // Each trip's total cost is spread across its duration in months (min 1 month).
  const monthlyTripsCost = trips.reduce((sum, trip) => {
    const totalTripCost =
      trip.flights + trip.hotels + trip.perDiem + trip.otherCosts;

    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    const durationMs = end.getTime() - start.getTime();
    const durationMonths = Math.max(1, durationMs / (1000 * 60 * 60 * 24 * 30));

    return sum + totalTripCost / durationMonths;
  }, 0);

  // --- Expenses (averaged to monthly, broken down by category) ---
  const ALL_CATEGORIES: ExpenseCategory[] = [
    "software", "cloud", "office", "travel", "meals",
    "equipment", "marketing", "legal", "deel", "payroll", "other",
  ];
  const expensesByCategory = Object.fromEntries(
    ALL_CATEGORIES.map((c) => [c, 0]),
  ) as Record<ExpenseCategory, number>;

  let monthlyExpenses = 0;
  if (expenses.length > 0) {
    const dates = expenses.map((e) => new Date(e.date));
    const earliest = new Date(Math.min(...dates.map((d) => d.getTime())));
    const latest = new Date(Math.max(...dates.map((d) => d.getTime())));

    const spanMs = latest.getTime() - earliest.getTime();
    const spanMonths = Math.max(1, spanMs / (1000 * 60 * 60 * 24 * 30));

    // Sum per category
    const totalsByCategory = Object.fromEntries(
      ALL_CATEGORIES.map((c) => [c, 0]),
    ) as Record<ExpenseCategory, number>;
    for (const exp of expenses) {
      totalsByCategory[exp.category] += exp.amount;
    }
    for (const cat of ALL_CATEGORIES) {
      expensesByCategory[cat] = totalsByCategory[cat] / spanMonths;
    }

    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    monthlyExpenses = totalExpenses / spanMonths;
  }

  // --- Totals ---
  const totalMonthlyBurn =
    monthlyPayroll +
    monthlyDeelFees +
    monthlyOfficeCosts +
    monthlyTripsCost +
    monthlyExpenses;

  // --- Revenue from entries (converted to monthly equivalent) ---
  const FREQUENCY_DIVISOR: Record<string, number> = {
    monthly: 1,
    quarterly: 3,
    annual: 12,
    "one-time": 0, // one-time doesn't contribute to recurring monthly
  };

  const monthlyRevenueFromEntries = revenues.reduce((sum, r) => {
    const divisor = FREQUENCY_DIVISOR[r.frequency] ?? 1;
    return divisor > 0 ? sum + r.amount / divisor : sum;
  }, 0);

  const totalMonthlyRevenue = monthlyRevenue + monthlyRevenueFromEntries;

  const netBurn = totalMonthlyBurn - totalMonthlyRevenue;

  const runwayMonths = netBurn > 0 ? cashOnHand / netBurn : Infinity;

  // Runway end date
  const now = new Date();
  let runwayDate: string;
  if (runwayMonths === Infinity) {
    runwayDate = "Infinite";
  } else {
    const endDate = new Date(now);
    const wholeMonths = Math.floor(runwayMonths);
    const fractionalDays = Math.round((runwayMonths - wholeMonths) * 30);
    endDate.setMonth(endDate.getMonth() + wholeMonths);
    endDate.setDate(endDate.getDate() + fractionalDays);
    runwayDate = endDate.toISOString().split("T")[0];
  }

  return {
    totalMonthlyBurn: round(totalMonthlyBurn),
    totalMonthlyRevenue: round(totalMonthlyRevenue),
    monthlyPayroll: round(monthlyPayroll),
    monthlyDeelFees: round(monthlyDeelFees),
    monthlyOfficeCosts: round(monthlyOfficeCosts),
    monthlyTripsCost: round(monthlyTripsCost),
    monthlyExpenses: round(monthlyExpenses),
    expensesByCategory: Object.fromEntries(
      ALL_CATEGORIES.map((c) => [c, round(expensesByCategory[c])]),
    ) as Record<ExpenseCategory, number>,
    netBurn: round(netBurn),
    runwayMonths: round(runwayMonths),
    runwayDate,
  };
}

/** Round to 2 decimal places. */
function round(n: number): number {
  if (!isFinite(n)) return n;
  return Math.round(n * 100) / 100;
}
