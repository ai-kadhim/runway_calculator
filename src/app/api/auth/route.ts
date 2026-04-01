import { NextRequest, NextResponse } from "next/server";

const TOKEN_URL = "https://oauth2.googleapis.com/token";

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
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
  return data.access_token ?? null;
}

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get("google_access_token")?.value;
  if (accessToken) {
    return NextResponse.json({ authenticated: true });
  }

  // Try refreshing
  const refreshToken = request.cookies.get("google_refresh_token")?.value;
  if (refreshToken) {
    const newToken = await refreshAccessToken(refreshToken);
    if (newToken) {
      const response = NextResponse.json({ authenticated: true });
      response.cookies.set("google_access_token", newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 3600,
      });
      return response;
    }
  }

  return NextResponse.json({ authenticated: false });
}

export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("google_access_token");
  response.cookies.delete("google_refresh_token");
  return response;
}
