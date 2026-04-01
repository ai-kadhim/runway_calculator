import { NextRequest, NextResponse } from "next/server";

const BREX_BASE = "https://platform.brexapis.com";

interface BrexAmount {
  amount: number; // cents
  currency: string;
}

interface BrexTransaction {
  id: string;
  description: string;
  amount: BrexAmount;
  posted_at_date: string;
  type: string;
  merchant?: { raw_descriptor?: string; mcc?: string; category?: string };
  category?: string;
  card_metadata?: { memo?: string };
}

interface BrexCashAccount {
  id: string;
  description: string;
  current_balance: BrexAmount;
  available_balance: BrexAmount;
}

async function fetchAllPages<T>(
  url: string,
  token: string,
  limit = 1000,
): Promise<T[]> {
  const items: T[] = [];
  let cursor: string | null = null;

  do {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set("cursor", cursor);

    const res = await fetch(`${url}?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Brex API ${res.status}: ${body}`);
    }

    const data = await res.json();
    items.push(...(data.items ?? []));
    cursor = data.next_cursor ?? null;
  } while (cursor);

  return items;
}

export async function POST(request: NextRequest) {
  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rawToken = body.token;
  const token = (rawToken && rawToken !== "__env__") ? rawToken : process.env.BREX_API_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "Brex API token required. Provide in request body or set BREX_API_TOKEN env var." },
      { status: 400 },
    );
  }

  try {
    // Fetch transactions and cash accounts in parallel
    const [transactions, cashAccounts] = await Promise.all([
      fetchAllPages<BrexTransaction>(
        `${BREX_BASE}/v2/transactions/card/primary`,
        token,
      ),
      fetchAllPages<BrexCashAccount>(
        `${BREX_BASE}/v2/accounts/cash`,
        token,
      ),
    ]);

    // Sum all cash account balances
    const totalBalance = cashAccounts.reduce(
      (sum, acc) => sum + acc.available_balance.amount,
      0,
    );

    return NextResponse.json({
      transactions,
      cashBalance: totalBalance / 100, // convert cents to dollars
      accountCount: cashAccounts.length,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const status = message.includes("401") ? 401 : message.includes("403") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
