import type { Employee, Expense, ExpenseCategory, Revenue, RevenueFrequency, Trip, RunwayState } from "@/types";

const VALID_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "software", "cloud", "office", "travel", "meals",
  "equipment", "marketing", "legal", "deel", "payroll", "other",
];

function safeNumber(value: unknown): number {
  const n = parseFloat(String(value ?? "").replace(/[$,]/g, "").trim());
  return Number.isNaN(n) ? 0 : n;
}

function safeString(value: unknown, fallback = ""): string {
  if (value == null) return fallback;
  const s = String(value).trim();
  return s === "" ? fallback : s;
}

/** Convert Sheets API response (header row + data rows) into objects */
function rowsToObjects(values: string[][]): Record<string, string>[] {
  if (!values || values.length < 2) return [];
  const headers = values[0].map((h) => h.trim());
  return values.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] ?? "";
    });
    return obj;
  });
}

export function extractSheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

async function fetchTab(sheetId: string, tab: string): Promise<Record<string, string>[]> {
  const res = await fetch(`/api/sheet?sheetId=${sheetId}&tab=${encodeURIComponent(tab)}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to fetch ${tab}: ${res.status}`);
  }
  const data = await res.json();
  return rowsToObjects(data.values ?? []);
}

export function parseSettings(rows: Record<string, string>[]): {
  cashOnHand: number;
  monthlyRevenue: number;
  monthlyOfficeCost: number;
} {
  const result = { cashOnHand: 0, monthlyRevenue: 0, monthlyOfficeCost: 0 };
  for (const row of rows) {
    const setting = safeString(row["Setting"]).toLowerCase();
    const value = safeNumber(row["Value"]);
    if (setting.includes("cash on hand")) result.cashOnHand = value;
    else if (setting.includes("monthly revenue")) result.monthlyRevenue = value;
    else if (setting.includes("office cost")) result.monthlyOfficeCost = value;
  }
  return result;
}

export function parseEmployees(rows: Record<string, string>[]): Employee[] {
  return rows
    .filter((row) => safeString(row["Name"]) !== "")
    .map((row) => ({
      id: crypto.randomUUID(),
      name: safeString(row["Name"]),
      role: safeString(row["Role"]),
      monthlySalaryUsd: safeNumber(row["Monthly Salary USD"]),
      startDate: safeString(row["Start Date"]),
      country: safeString(row["Country"]),
      deelContractType:
        safeString(row["Deel Contract Type"]).toLowerCase() === "contractor"
          ? ("contractor" as const)
          : ("full-time" as const),
      deelFeeMonthly: safeNumber(row["Deel Fee Monthly"]),
    }));
}

export function parseTrips(rows: Record<string, string>[]): Trip[] {
  return rows
    .filter((row) => safeString(row["Destination"]) !== "")
    .map((row) => ({
      id: crypto.randomUUID(),
      description: safeString(row["Description"]),
      destination: safeString(row["Destination"]),
      startDate: safeString(row["Start Date"]),
      endDate: safeString(row["End Date"]),
      flights: safeNumber(row["Flights"]),
      hotels: safeNumber(row["Hotels"]),
      perDiem: safeNumber(row["Per Diem"]),
      otherCosts: safeNumber(row["Other Costs"]),
    }));
}

export function parseExpenses(rows: Record<string, string>[]): Expense[] {
  return rows
    .filter((row) => safeString(row["Description"]) !== "")
    .map((row) => {
      const rawCat = safeString(row["Category"]).toLowerCase() as ExpenseCategory;
      const category: ExpenseCategory = VALID_EXPENSE_CATEGORIES.includes(rawCat)
        ? rawCat
        : "other";
      const rawSource = safeString(row["Source"]).toLowerCase();
      return {
        id: crypto.randomUUID(),
        date: safeString(row["Date"]),
        description: safeString(row["Description"]),
        category,
        amount: safeNumber(row["Amount"]),
        vendor: safeString(row["Vendor"]),
        source: rawSource === "brex" ? ("brex" as const) : ("manual" as const),
      };
    });
}

const VALID_FREQUENCIES: RevenueFrequency[] = ["monthly", "quarterly", "annual", "one-time"];

export function parseRevenues(rows: Record<string, string>[]): Revenue[] {
  return rows
    .filter((row) => safeString(row["Description"]) !== "")
    .map((row) => {
      const rawFreq = safeString(row["Frequency"]).toLowerCase() as RevenueFrequency;
      const frequency: RevenueFrequency = VALID_FREQUENCIES.includes(rawFreq) ? rawFreq : "monthly";
      return {
        id: crypto.randomUUID(),
        date: safeString(row["Date"]),
        description: safeString(row["Description"]),
        amount: safeNumber(row["Amount"]),
        client: safeString(row["Client"]),
        frequency,
      };
    });
}

// ---------------------------------------------------------------------------
// Write helpers — convert store state back to sheet rows
// ---------------------------------------------------------------------------

export async function writeTabToSheet(
  sheetId: string,
  tab: string,
  values: string[][],
): Promise<void> {
  const res = await fetch("/api/sheet", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sheetId, tab, values }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.details || body.error || `Failed to write ${tab}: ${res.status}`);
  }
}

export function employeesToRows(employees: Employee[]): string[][] {
  const header = [
    "Name",
    "Role",
    "Monthly Salary USD",
    "Start Date",
    "Country",
    "Deel Contract Type",
    "Deel Fee Monthly",
  ];
  const data = employees.map((e) => [
    e.name,
    e.role,
    String(e.monthlySalaryUsd),
    e.startDate,
    e.country,
    e.deelContractType,
    String(e.deelFeeMonthly),
  ]);
  return [header, ...data];
}

export function tripsToRows(trips: Trip[]): string[][] {
  const header = [
    "Description",
    "Destination",
    "Start Date",
    "End Date",
    "Flights",
    "Hotels",
    "Per Diem",
    "Other Costs",
  ];
  const data = trips.map((t) => [
    t.description,
    t.destination,
    t.startDate,
    t.endDate,
    String(t.flights),
    String(t.hotels),
    String(t.perDiem),
    String(t.otherCosts),
  ]);
  return [header, ...data];
}

export function expensesToRows(expenses: Expense[]): string[][] {
  const header = [
    "Date",
    "Description",
    "Category",
    "Amount",
    "Vendor",
    "Source",
  ];
  const data = expenses.map((e) => [
    e.date,
    e.description,
    e.category,
    String(e.amount),
    e.vendor,
    e.source,
  ]);
  return [header, ...data];
}

export function revenuesToRows(revenues: Revenue[]): string[][] {
  const header = ["Date", "Description", "Amount", "Client", "Frequency"];
  const data = revenues.map((r) => [
    r.date,
    r.description,
    String(r.amount),
    r.client,
    r.frequency,
  ]);
  return [header, ...data];
}

export function settingsToRows(settings: {
  cashOnHand: number;
  monthlyRevenue: number;
  monthlyOfficeCost: number;
}): string[][] {
  const header = ["Setting", "Value"];
  return [
    header,
    ["Cash on Hand", String(settings.cashOnHand)],
    ["Monthly Revenue", String(settings.monthlyRevenue)],
    ["Monthly Office Cost", String(settings.monthlyOfficeCost)],
  ];
}

// ---------------------------------------------------------------------------
// Ensure required tabs exist
// ---------------------------------------------------------------------------

export async function ensureSheetTabs(sheetId: string): Promise<void> {
  const res = await fetch("/api/sheet", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sheetId }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to initialize sheet: ${res.status}`);
  }
}

// ---------------------------------------------------------------------------
// Fetch all runway data from the sheet
// ---------------------------------------------------------------------------

export async function fetchRunwayDataFromSheet(sheetId: string): Promise<RunwayState> {
  const [settingsResult, employeesResult, tripsResult, expensesResult, revenueResult] =
    await Promise.allSettled([
      fetchTab(sheetId, "Settings"),
      fetchTab(sheetId, "Employees"),
      fetchTab(sheetId, "Trips"),
      fetchTab(sheetId, "Expenses"),
      fetchTab(sheetId, "Revenue"),
    ]);

  const settings =
    settingsResult.status === "fulfilled"
      ? parseSettings(settingsResult.value)
      : { cashOnHand: 0, monthlyRevenue: 0, monthlyOfficeCost: 0 };

  const employees =
    employeesResult.status === "fulfilled"
      ? parseEmployees(employeesResult.value)
      : [];

  const trips =
    tripsResult.status === "fulfilled"
      ? parseTrips(tripsResult.value)
      : [];

  const expenses =
    expensesResult.status === "fulfilled"
      ? parseExpenses(expensesResult.value)
      : [];

  const revenues =
    revenueResult.status === "fulfilled"
      ? parseRevenues(revenueResult.value)
      : [];

  return {
    companyName: "Next Signal",
    cashOnHand: settings.cashOnHand,
    monthlyRevenue: settings.monthlyRevenue,
    monthlyOfficeCost: settings.monthlyOfficeCost,
    employees,
    trips,
    expenses,
    revenues,
  };
}
