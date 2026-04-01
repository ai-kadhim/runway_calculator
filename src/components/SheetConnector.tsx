"use client";

import { useState, useEffect, useCallback } from "react";
import { useRunwayStore } from "@/store/runway-store";
import { extractSheetId } from "@/lib/google-sheets";

export default function SheetConnector({
  onConnected,
}: {
  onConnected: () => void;
}) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const sheetId = useRunwayStore((s) => s.sheetId);
  const setSheetId = useRunwayStore((s) => s.setSheetId);
  const storeError = useRunwayStore((s) => s.error);

  const checkAuth = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/auth");
      const data = await res.json();
      setAuthenticated(data.authenticated);
    } catch {
      setAuthenticated(false);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Check for auth errors from OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("auth_error");
    if (authError) {
      setError(`Google sign-in failed: ${authError}`);
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleSignIn = () => {
    window.location.href = "/api/auth/google";
  };

  const handleSignOut = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    setAuthenticated(false);
  };

  const handleConnect = () => {
    const id = extractSheetId(url);
    if (!id) {
      setError("Invalid Google Sheets URL. Paste the full URL from your browser.");
      return;
    }
    setError(null);
    setSheetId(id);
    onConnected();
  };

  const handleDisconnect = () => {
    setSheetId("");
    setUrl("");
  };

  if (sheetId) {
    return (
      <div className={`rounded-xl border p-4 ${authenticated ? "border-emerald-800/50 bg-emerald-950/30" : "border-amber-800/50 bg-amber-950/30"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {authenticated ? (
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            ) : (
              <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            )}
            <span className={`text-sm ${authenticated ? "text-emerald-300" : "text-amber-300"}`}>
              {authenticated ? "Connected to Google Sheet" : "Sheet connected — sign in required"}
            </span>
            <a
              href={`https://docs.google.com/spreadsheets/d/${sheetId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                <path d="M8.914 6.025a.75.75 0 0 1 1.06 0 3.5 3.5 0 0 1 0 4.95l-2 2a3.5 3.5 0 0 1-5.396-4.402.75.75 0 0 1 1.251.827 2 2 0 0 0 3.085 2.514l2-2a2 2 0 0 0 0-2.828.75.75 0 0 1 0-1.06Z" />
                <path d="M7.086 9.975a.75.75 0 0 1-1.06 0 3.5 3.5 0 0 1 0-4.95l2-2a3.5 3.5 0 0 1 5.396 4.402.75.75 0 0 1-1.251-.827 2 2 0 0 0-3.085-2.514l-2 2a2 2 0 0 0 0 2.828.75.75 0 0 1 0 1.06Z" />
              </svg>
              Open in Sheets
            </a>
          </div>
          <div className="flex items-center gap-2">
            {!authenticated && (
              <button
                onClick={handleSignIn}
                className="rounded-lg bg-white hover:bg-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-900 transition-colors flex items-center gap-1.5"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Sign in
              </button>
            )}
            {authenticated && (
              <button
                onClick={async () => {
                  await handleSignOut();
                  handleDisconnect();
                }}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors"
              >
                Sign out
              </button>
            )}
            <button
              onClick={handleDisconnect}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors"
            >
              Disconnect
            </button>
          </div>
        </div>
        {storeError && (
          <p className="mt-2 text-sm text-rose-400">{storeError}</p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100 mb-2">
          Connect Google Sheet
        </h2>
        <p className="text-sm text-zinc-400">
          Your spreadsheet stays fully private — the app authenticates as your
          Google account.
        </p>
      </div>

      {/* Step 1: Google Auth */}
      <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-700 text-xs font-bold text-zinc-300">
              1
            </span>
            <span className="text-sm font-medium text-zinc-200">
              Sign in with Google
            </span>
            {authenticated === true && (
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                Authenticated
              </span>
            )}
          </div>
          {authenticated === true ? (
            <button
              onClick={handleSignOut}
              className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Sign out
            </button>
          ) : (
            <button
              onClick={handleSignIn}
              disabled={checking}
              className="rounded-lg bg-white hover:bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors flex items-center gap-2"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Sign in with Google
            </button>
          )}
        </div>
      </div>

      {/* Step 2: Sheet URL */}
      <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4 space-y-3">
        <div className="flex items-center gap-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-700 text-xs font-bold text-zinc-300">
            2
          </span>
          <span className="text-sm font-medium text-zinc-200">
            Paste your Google Sheet URL
          </span>
        </div>

        <div className="text-xs text-zinc-400 space-y-1 ml-9">
          <p>
            Create a sheet with tabs: <strong className="text-zinc-300">Settings</strong>,{" "}
            <strong className="text-zinc-300">Employees</strong>,{" "}
            <strong className="text-zinc-300">Trips</strong>,{" "}
            <strong className="text-zinc-300">Expenses</strong>
          </p>
        </div>

        <div className="flex gap-2 ml-9">
          <input
            type="url"
            placeholder="https://docs.google.com/spreadsheets/d/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleConnect()}
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors"
          />
          <button
            onClick={handleConnect}
            disabled={authenticated !== true}
            className="rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 px-5 py-2.5 text-sm font-medium text-white transition-colors"
          >
            Connect
          </button>
        </div>
      </div>

      {/* Tab format reference */}
      <details className="text-xs text-zinc-400">
        <summary className="cursor-pointer text-zinc-300 hover:text-zinc-100 transition-colors">
          Expected tab formats
        </summary>
        <div className="mt-2 space-y-1.5 ml-4">
          <p>
            <strong className="text-zinc-200">Settings</strong> — Setting | Value
            <span className="text-zinc-500"> (rows: Cash on Hand, Monthly Revenue, Monthly Office Cost)</span>
          </p>
          <p>
            <strong className="text-zinc-200">Employees</strong> — Name | Role | Monthly Salary USD | Start Date | Country | Deel Contract Type | Deel Fee Monthly
          </p>
          <p>
            <strong className="text-zinc-200">Trips</strong> — Description | Destination | Start Date | End Date | Flights | Hotels | Per Diem | Other Costs
          </p>
          <p>
            <strong className="text-zinc-200">Expenses</strong> — Date | Description | Category | Amount | Vendor | Source
          </p>
        </div>
      </details>

      {error && <p className="text-sm text-rose-400">{error}</p>}
    </div>
  );
}
