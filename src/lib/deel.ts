import type { Employee } from "@/types";

interface DeelPayment {
  rate?: number;
  scale?: string; // "monthly", "annually", "weekly", "hourly"
  currency?: string;
  contract_name?: string;
}

interface DeelEmployment {
  id?: string;
  name?: string;
  country?: string;
  state?: string;
  hiring_type?: string;
  contract_status?: string;
  payment?: DeelPayment;
}

interface DeelPerson {
  id: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  country?: string;
  job_title?: string;
  hiring_type?: string; // "employee", "contractor"
  hiring_status?: string; // "active", "onboarding", "offboarding", "inactive"
  start_date?: string;
  employments?: DeelEmployment[];
}

interface DeelInvoice {
  id: string;
  label?: string;
  total?: string;
  amount?: string;
  status?: string;
  currency?: string;
  deel_fee?: string;
  contract_id?: string;
}

/**
 * Convert a payment rate to monthly USD.
 * For simplicity we assume USD — a proper implementation would use exchange rates.
 */
function toMonthlySalary(payment?: DeelPayment): number {
  if (!payment?.rate) return 0;
  const amount = typeof payment.rate === "string" ? parseFloat(payment.rate) : payment.rate;
  if (isNaN(amount)) return 0;

  const scale = (payment.scale ?? "").toLowerCase();

  // Annual / yearly variants
  if (scale === "annually" || scale === "annual" || scale === "year" || scale === "yearly" || scale.includes("12")) {
    return Math.round(amount / 12);
  }
  // Biweekly (every 2 weeks = 26 pay periods/year)
  if (scale === "biweekly" || scale === "bi-weekly" || scale === "bimonthly") {
    return Math.round((amount * 26) / 12);
  }
  // Semimonthly (twice a month = 24 pay periods/year)
  if (scale === "semimonthly" || scale === "semi-monthly" || scale === "semi_monthly") {
    return Math.round(amount * 2);
  }
  // Weekly
  if (scale === "weekly") {
    return Math.round((amount * 52) / 12);
  }
  // Daily
  if (scale === "daily") {
    return Math.round((amount * 260) / 12); // ~260 working days/year
  }
  // Hourly
  if (scale === "hourly") {
    return Math.round((amount * 40 * 52) / 12);
  }
  // Monthly or unknown — treat as monthly
  return Math.round(amount);
}

function isFullTime(hiringType?: string): boolean {
  if (!hiringType) return false;
  const t = hiringType.toLowerCase();
  // Anything that is NOT explicitly a contractor/freelancer is treated as full-time
  const contractorPatterns = ["contractor", "freelance", "freelancer", "ic", "independent"];
  return !contractorPatterns.some((p) => t.includes(p));
}

export function deelPeopleToEmployees(people: DeelPerson[]): Employee[] {
  return people
    .filter((p) => p.hiring_status === "active" || p.hiring_status === "onboarding")
    .map((p) => {
      const name = p.full_name
        || `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim()
        || "Unknown";

      // Use the first active employment for salary info
      const employment = p.employments?.find(
        (e) => e.contract_status === "in_progress" || e.contract_status === "onboarded",
      ) ?? p.employments?.[0];

      const country = p.country || employment?.country || "";

      return {
        id: crypto.randomUUID(),
        name,
        role: p.job_title ?? employment?.name ?? "",
        monthlySalaryUsd: toMonthlySalary(employment?.payment),
        startDate: p.start_date ?? "",
        country,
        deelContractType: isFullTime(p.hiring_type ?? employment?.hiring_type)
          ? "full-time" as const
          : "contractor" as const,
        deelFeeMonthly: 0, // Will be filled from invoices
      };
    });
}

/**
 * Calculate total monthly Deel platform fees from invoices.
 * Sums the `deel_fee` field across recent invoices and averages to monthly.
 */
export function calculateMonthlyDeelFees(invoices: DeelInvoice[]): number {
  if (invoices.length === 0) return 0;

  const totalFees = invoices.reduce((sum, inv) => {
    // On /invoices/deel, the total/amount IS the Deel fee; deel_fee may also be present
    const fee = parseFloat(inv.deel_fee ?? inv.total ?? inv.amount ?? "0");
    return sum + (isNaN(fee) ? 0 : fee);
  }, 0);

  return Math.round(totalFees * 100) / 100;
}

export interface DeelSyncResult {
  employees: Employee[];
  totalDeelFees: number;
  peopleCount: number;
  invoiceCount: number;
}

export async function syncFromDeel(token: string): Promise<DeelSyncResult> {
  const res = await fetch("/api/deel/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Deel sync failed: ${res.status}`);
  }

  const data = await res.json();

  const employees = deelPeopleToEmployees(data.people ?? []);
  const totalDeelFees = calculateMonthlyDeelFees(data.invoices ?? []);

  // Distribute total fees evenly across employees as an approximation
  if (employees.length > 0 && totalDeelFees > 0) {
    const feePerEmployee = Math.round((totalDeelFees / employees.length) * 100) / 100;
    for (const emp of employees) {
      emp.deelFeeMonthly = feePerEmployee;
    }
  }

  return {
    employees,
    totalDeelFees,
    peopleCount: data.people?.length ?? 0,
    invoiceCount: data.invoices?.length ?? 0,
  };
}
