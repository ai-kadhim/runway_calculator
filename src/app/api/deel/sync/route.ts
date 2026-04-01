import { NextRequest, NextResponse } from "next/server";

const DEEL_BASE = "https://api.letsdeel.com/rest/v2";

interface DeelPerson {
  id: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  country?: string;
  state?: string;
  job_title?: string;
  hiring_type?: string; // "employee", "contractor", etc.
  hiring_status?: string; // "active", "onboarding", "offboarding", "inactive"
  start_date?: string;
  employments?: {
    id?: string;
    name?: string;
    country?: string;
    state?: string;
    hiring_type?: string;
    contract_status?: string;
    payment?: {
      rate?: number;
      scale?: string; // "monthly", "annually", "weekly", "hourly"
      currency?: string;
      contract_name?: string;
    };
  }[];
  department?: {
    id?: string;
    name?: string;
  };
}

interface DeelInvoice {
  id: string;
  label?: string;
  total?: string;
  amount?: string;
  status?: string; // "pending", "paid", "processing", "credited", "refunded"
  currency?: string;
  deel_fee?: string;
  due_date?: string;
  issued_at?: string;
  paid_at?: string | null;
  contract_id?: string;
}

const headers = (token: string) => ({
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
});

async function fetchDeelPaginated<T>(
  path: string,
  token: string,
  limit = 50,
): Promise<T[]> {
  const items: T[] = [];
  let offset = 0;

  do {
    const url = `${DEEL_BASE}${path}?limit=${limit}&offset=${offset}`;
    const res = await fetch(url, { headers: headers(token) });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Deel API ${res.status}: ${body}`);
    }

    const json = await res.json();
    const data = json.data;

    if (Array.isArray(data)) {
      items.push(...data);
      if (data.length < limit) break;
    } else if (data?.rows && Array.isArray(data.rows)) {
      // Some endpoints (like invoices) nest under data.rows
      items.push(...data.rows);
      if (data.rows.length < limit) break;
    } else {
      if (data) items.push(data);
      break;
    }

    offset += limit;
  } while (true);

  return items;
}

// Debug endpoint — GET to inspect raw Deel API responses
export async function GET() {
  const token = process.env.DEEL_API_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "No DEEL_API_TOKEN set" }, { status: 400 });
  }

  try {
    // Fetch first page of people raw
    const peopleRes = await fetch(`${DEEL_BASE}/people?limit=2&offset=0`, {
      headers: headers(token),
    });
    const peopleJson = peopleRes.ok ? await peopleRes.json() : { error: await peopleRes.text() };

    // Fetch first page of /invoices/deel raw
    const invoicesRes = await fetch(`${DEEL_BASE}/invoices/deel?limit=2&offset=0`, {
      headers: headers(token),
    });
    const invoicesJson = invoicesRes.ok ? await invoicesRes.json() : { error: await invoicesRes.text() };

    // Also try /contracts for comparison
    const contractsRes = await fetch(`${DEEL_BASE}/contracts?limit=2&offset=0`, {
      headers: headers(token),
    });
    const contractsJson = contractsRes.ok ? await contractsRes.json() : { error: await contractsRes.text() };

    return NextResponse.json({
      people: { status: peopleRes.status, body: peopleJson },
      invoices_deel: { status: invoicesRes.status, body: invoicesJson },
      contracts: { status: contractsRes.status, body: contractsJson },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rawToken = body.token;
  const token =
    rawToken && rawToken !== "__env__"
      ? rawToken
      : process.env.DEEL_API_TOKEN;
  if (!token) {
    return NextResponse.json(
      {
        error:
          "Deel API token required. Provide in request body or set DEEL_API_TOKEN env var.",
      },
      { status: 400 },
    );
  }

  try {
    // Fetch people and Deel fee invoices in parallel
    const [people, deelFeeInvoices] = await Promise.all([
      fetchDeelPaginated<DeelPerson>("/people", token),
      fetchDeelPaginated<DeelInvoice>("/invoices/deel", token),
    ]);

    return NextResponse.json({ people, invoices: deelFeeInvoices });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const status = message.includes("401")
      ? 401
      : message.includes("403")
        ? 403
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
