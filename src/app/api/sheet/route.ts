import { NextRequest, NextResponse } from "next/server";

const REQUIRED_TABS = ["Settings", "Employees", "Trips", "Expenses", "Revenue"];
const ALLOWED_TABS = REQUIRED_TABS;
const TOKEN_URL = "https://oauth2.googleapis.com/token";

async function getAccessToken(
  request: NextRequest,
): Promise<{ token: string; newTokenCookie?: string } | null> {
  const accessToken = request.cookies.get("google_access_token")?.value;
  if (accessToken) return { token: accessToken };

  // Try refreshing
  const refreshToken = request.cookies.get("google_refresh_token")?.value;
  if (!refreshToken) return null;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  if (!data.access_token) return null;

  return { token: data.access_token, newTokenCookie: data.access_token };
}

function applyTokenRefresh(
  response: NextResponse,
  newTokenCookie?: string,
): NextResponse {
  if (newTokenCookie) {
    response.cookies.set("google_access_token", newTokenCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 3600,
    });
  }
  return response;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const sheetId = searchParams.get("sheetId");
  const tab = searchParams.get("tab");

  if (!sheetId || !/^[a-zA-Z0-9_-]+$/.test(sheetId)) {
    return NextResponse.json({ error: "Invalid sheetId" }, { status: 400 });
  }

  if (!tab || !ALLOWED_TABS.includes(tab)) {
    return NextResponse.json(
      { error: `Invalid tab. Allowed: ${ALLOWED_TABS.join(", ")}` },
      { status: 400 },
    );
  }

  const auth = await getAccessToken(request);
  if (!auth) {
    return NextResponse.json(
      { error: "not_authenticated" },
      { status: 401 },
    );
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(tab)}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${auth.token}` },
  });

  if (!response.ok) {
    const body = await response.text();
    return NextResponse.json(
      { error: `Google Sheets API error: ${response.status}`, details: body },
      { status: response.status },
    );
  }

  const data = await response.json();
  return applyTokenRefresh(NextResponse.json(data), auth.newTokenCookie);
}

export async function PUT(request: NextRequest) {
  let body: { sheetId?: string; tab?: string; values?: string[][] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { sheetId, tab, values } = body;

  if (!sheetId || !/^[a-zA-Z0-9_-]+$/.test(sheetId)) {
    return NextResponse.json({ error: "Invalid sheetId" }, { status: 400 });
  }

  if (!tab || !ALLOWED_TABS.includes(tab)) {
    return NextResponse.json(
      { error: `Invalid tab. Allowed: ${ALLOWED_TABS.join(", ")}` },
      { status: 400 },
    );
  }

  if (!values || !Array.isArray(values)) {
    return NextResponse.json(
      { error: "values must be a string[][]" },
      { status: 400 },
    );
  }

  const auth = await getAccessToken(request);
  if (!auth) {
    return NextResponse.json(
      { error: "not_authenticated" },
      { status: 401 },
    );
  }

  const encodedTab = encodeURIComponent(tab);

  // 1. Clear existing tab data
  const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodedTab}:clear`;
  const clearRes = await fetch(clearUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${auth.token}` },
  });

  if (!clearRes.ok) {
    const clearBody = await clearRes.text();
    return NextResponse.json(
      { error: `Failed to clear tab: ${clearRes.status}`, details: clearBody },
      { status: clearRes.status },
    );
  }

  // 2. Write new values
  const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodedTab}?valueInputOption=RAW`;
  const writeRes = await fetch(writeUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${auth.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values }),
  });

  if (!writeRes.ok) {
    const writeBody = await writeRes.text();
    return NextResponse.json(
      { error: `Failed to write tab: ${writeRes.status}`, details: writeBody },
      { status: writeRes.status },
    );
  }

  const result = await writeRes.json();
  return applyTokenRefresh(
    NextResponse.json({ success: true, updatedCells: result.updatedCells }),
    auth.newTokenCookie,
  );
}

/** POST — ensure all required tabs exist in the spreadsheet */
export async function POST(request: NextRequest) {
  let body: { sheetId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { sheetId } = body;
  if (!sheetId || !/^[a-zA-Z0-9_-]+$/.test(sheetId)) {
    return NextResponse.json({ error: "Invalid sheetId" }, { status: 400 });
  }

  const auth = await getAccessToken(request);
  if (!auth) {
    return NextResponse.json(
      { error: "not_authenticated" },
      { status: 401 },
    );
  }

  // Get existing sheet metadata
  const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties.title`;
  const metaRes = await fetch(metaUrl, {
    headers: { Authorization: `Bearer ${auth.token}` },
  });

  if (!metaRes.ok) {
    const metaBody = await metaRes.text();
    return NextResponse.json(
      { error: `Failed to read spreadsheet: ${metaRes.status}`, details: metaBody },
      { status: metaRes.status },
    );
  }

  const meta = await metaRes.json();
  const existingTabs: string[] = (meta.sheets ?? []).map(
    (s: { properties: { title: string } }) => s.properties.title,
  );

  const missingTabs = REQUIRED_TABS.filter((t) => !existingTabs.includes(t));

  if (missingTabs.length === 0) {
    return applyTokenRefresh(
      NextResponse.json({ success: true, created: [] }),
      auth.newTokenCookie,
    );
  }

  // Create missing tabs via batchUpdate
  const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`;
  const requests = missingTabs.map((title) => ({
    addSheet: { properties: { title } },
  }));

  const batchRes = await fetch(batchUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${auth.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ requests }),
  });

  if (!batchRes.ok) {
    const batchBody = await batchRes.text();
    return NextResponse.json(
      { error: `Failed to create tabs: ${batchRes.status}`, details: batchBody },
      { status: batchRes.status },
    );
  }

  return applyTokenRefresh(
    NextResponse.json({ success: true, created: missingTabs }),
    auth.newTokenCookie,
  );
}
