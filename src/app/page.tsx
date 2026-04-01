"use client";

import { useState, useCallback } from "react";
import Dashboard from "@/components/Dashboard";
import SheetConnector from "@/components/SheetConnector";
import EmployeeManager from "@/components/EmployeeManager";
import TripManager from "@/components/TripManager";
import ExpenseManager from "@/components/ExpenseManager";
import RevenueManager from "@/components/RevenueManager";
import BrexConnector from "@/components/BrexConnector";
import { useRunwayStore } from "@/store/runway-store";

const tabs = [
  { id: "dashboard", label: "Dashboard" },
  { id: "revenue", label: "Revenue" },
  { id: "employees", label: "Employees & Deel" },
  { id: "expenses", label: "Expenses" },
  { id: "trips", label: "Trips" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const sheetId = useRunwayStore((s) => s.sheetId);
  const lastFetched = useRunwayStore((s) => s.lastFetched);
  const loading = useRunwayStore((s) => s.loading);

  const handleRefresh = useCallback(async () => {
    if (!sheetId) return;
    const store = useRunwayStore.getState();
    store.setLoading(true);
    store.setError(null);
    try {
      const { ensureSheetTabs, fetchRunwayDataFromSheet } = await import(
        "@/lib/google-sheets"
      );
      await ensureSheetTabs(sheetId);
      const data = await fetchRunwayDataFromSheet(sheetId);
      store.setSheetData(data);
      store.setLastFetched(new Date());
    } catch (e) {
      store.setError(e instanceof Error ? e.message : "Failed to fetch sheet");
    } finally {
      store.setLoading(false);
    }
  }, [sheetId]);

  return (
    <main className="min-h-screen">
      <nav className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-400 to-blue-500" />
              <span className="text-lg font-bold tracking-tight">
                Next Signal
              </span>
              <span className="ml-1 rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                Runway
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? "bg-zinc-800 text-white"
                        : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              {sheetId && (
                <div className="flex items-center gap-2 ml-2 pl-2 border-l border-zinc-700">
                  {lastFetched && (
                    <span className="text-xs text-zinc-500">
                      {new Date(lastFetched).toLocaleTimeString()}
                    </span>
                  )}
                  <button
                    onClick={handleRefresh}
                    disabled={loading}
                    className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 px-3 py-1.5 text-xs font-medium text-white transition-colors"
                  >
                    {loading ? "Syncing..." : "Refresh"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-3 mb-8">
          <SheetConnector onConnected={handleRefresh} />
          <BrexConnector />
        </div>
        {activeTab === "dashboard" && <Dashboard />}
        {activeTab === "revenue" && <RevenueManager />}
        {activeTab === "employees" && <EmployeeManager />}
        {activeTab === "expenses" && <ExpenseManager />}
        {activeTab === "trips" && <TripManager />}
      </div>
    </main>
  );
}
