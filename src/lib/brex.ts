import type { Expense, ExpenseCategory } from "@/types";

interface BrexMerchant {
  raw_descriptor?: string;
  mcc?: string;
  category?: string;
}

interface BrexTransaction {
  id: string;
  description: string;
  amount: { amount: number; currency: string };
  posted_at_date: string;
  type: string;
  merchant?: BrexMerchant;
  category?: string;
}

// Map Brex category strings to our ExpenseCategory
const BREX_CATEGORY_MAP: Record<string, ExpenseCategory> = {
  // Software & SaaS
  software: "software",
  saas: "software",
  "computer software": "software",
  "software development": "software",
  "digital goods": "software",
  // Cloud & hosting
  "cloud services": "cloud",
  "web hosting": "cloud",
  hosting: "cloud",
  "data processing": "cloud",
  // Travel
  airlines: "travel",
  "car rental": "travel",
  hotels: "travel",
  lodging: "travel",
  travel: "travel",
  "travel agencies": "travel",
  transportation: "travel",
  "ground transportation": "travel",
  taxi: "travel",
  "ride sharing": "travel",
  // Meals
  restaurants: "meals",
  "food delivery": "meals",
  "eating places": "meals",
  "fast food": "meals",
  catering: "meals",
  // Office
  "office supplies": "office",
  "office equipment": "office",
  stationery: "office",
  // Equipment
  electronics: "equipment",
  "computer hardware": "equipment",
  hardware: "equipment",
  // Marketing & advertising
  advertising: "marketing",
  marketing: "marketing",
  "advertising services": "marketing",
  "digital advertising": "marketing",
  // Legal
  "legal services": "legal",
  legal: "legal",
  // Payroll
  payroll: "payroll",
  "payroll services": "payroll",
};

function mapFromBrexCategory(brexCategory?: string): ExpenseCategory | null {
  if (!brexCategory) return null;
  const normalized = brexCategory.toLowerCase().trim();
  // Direct match
  if (BREX_CATEGORY_MAP[normalized]) return BREX_CATEGORY_MAP[normalized];
  // Partial match — check if any known key is contained in the Brex category
  for (const [key, value] of Object.entries(BREX_CATEGORY_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) return value;
  }
  return null;
}

// Fallback: map from MCC codes and description keywords
function mapFromMcc(mcc: string, desc: string): ExpenseCategory {
  // Airlines
  if (mcc >= "3000" && mcc <= "3350") return "travel";
  if (mcc >= "4511" && mcc <= "4599") return "travel";
  // Hotels
  if (mcc >= "3501" && mcc <= "3999") return "travel";
  if (mcc >= "7011" && mcc <= "7033") return "travel";
  // Ground transport
  if (mcc >= "4111" && mcc <= "4131") return "travel";
  if (mcc === "4121" || mcc === "7512" || mcc === "7519") return "travel";
  // Restaurants
  if (mcc >= "5811" && mcc <= "5814") return "meals";
  // Software / SaaS
  if (mcc === "5734" || mcc === "5817" || mcc === "5818") return "software";
  // Cloud / hosting
  if (desc.includes("aws") || desc.includes("google cloud") || desc.includes("azure") || desc.includes("heroku") || desc.includes("vercel") || desc.includes("digitalocean") || desc.includes("cloudflare")) return "cloud";
  // Office supplies
  if (mcc >= "5940" && mcc <= "5950") return "office";
  // Electronics / equipment
  if (mcc >= "5045" && mcc <= "5046") return "equipment";
  if (mcc === "5732" || mcc === "5065") return "equipment";
  // Legal
  if (mcc === "8111") return "legal";
  // Marketing / advertising
  if (mcc >= "7311" && mcc <= "7399") return "marketing";
  if (desc.includes("facebook") || desc.includes("meta") || desc.includes("google ads") || desc.includes("linkedin") || desc.includes("tiktok") || desc.includes("twitter") || desc.includes("mailchimp") || desc.includes("hubspot")) return "marketing";
  // Payroll
  if (desc.includes("gusto") || desc.includes("rippling") || desc.includes("adp") || desc.includes("deel") || desc.includes("remote.com") || desc.includes("justworks")) return "payroll";

  return "other";
}

function mapCategory(merchant?: BrexMerchant, description?: string, transactionCategory?: string): ExpenseCategory {
  // 1. Use Brex's own category if available (from transaction or merchant)
  const fromTxnCategory = mapFromBrexCategory(transactionCategory);
  if (fromTxnCategory) return fromTxnCategory;

  const fromMerchantCategory = mapFromBrexCategory(merchant?.category);
  if (fromMerchantCategory) return fromMerchantCategory;

  // 2. Fall back to MCC + description matching
  const mcc = merchant?.mcc ?? "";
  const desc = (description ?? "").toLowerCase();
  return mapFromMcc(mcc, desc);
}

export function brexTransactionsToExpenses(
  transactions: BrexTransaction[],
): Expense[] {
  return transactions
    .filter((t) => t.type === "PURCHASE" || t.type === "REFUND")
    .map((t) => ({
      id: crypto.randomUUID(),
      date: t.posted_at_date,
      description: t.description,
      category: mapCategory(t.merchant, t.description, t.category),
      amount: Math.abs(t.amount.amount) / 100, // cents to dollars, absolute value
      vendor: t.merchant?.raw_descriptor ?? t.description,
      source: "brex" as const,
    }));
}

export interface BrexSyncResult {
  expenses: Expense[];
  cashBalance: number;
  accountCount: number;
}

export async function syncFromBrex(token: string): Promise<BrexSyncResult> {
  const res = await fetch("/api/brex/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Brex sync failed: ${res.status}`);
  }

  const data = await res.json();

  return {
    expenses: brexTransactionsToExpenses(data.transactions),
    cashBalance: data.cashBalance,
    accountCount: data.accountCount,
  };
}
