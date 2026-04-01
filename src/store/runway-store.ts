import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Employee, Trip, Expense, Revenue, RunwayState } from "@/types";

interface SheetConfig {
  sheetId: string;
}

interface RunwayActions {
  setSheetId: (id: string) => void;
  setSheetData: (data: RunwayState) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setLastFetched: (date: Date | null) => void;

  // Mutation actions — update local state and sync back to sheet
  addEmployee: (employee: Omit<Employee, "id">) => void;
  removeEmployee: (id: string) => void;
  removeEmployees: (ids: string[]) => void;
  addTrip: (trip: Omit<Trip, "id">) => void;
  removeTrip: (id: string) => void;
  removeTrips: (ids: string[]) => void;
  addExpense: (expense: Omit<Expense, "id">) => void;
  removeExpense: (id: string) => void;
  removeExpenses: (ids: string[]) => void;
  addRevenue: (revenue: Omit<Revenue, "id">) => void;
  removeRevenue: (id: string) => void;
  removeRevenues: (ids: string[]) => void;
  setCashOnHand: (amount: number) => void;
  setMonthlyRevenue: (amount: number) => void;
  setMonthlyOfficeCost: (amount: number) => void;
  setBrexToken: (token: string) => void;
  syncBrex: () => Promise<void>;
}

export interface RunwayStore extends RunwayState, SheetConfig, RunwayActions {
  brexToken: string;
  brexSyncing: boolean;
  brexLastSynced: string | null;
  loading: boolean;
  error: string | null;
  lastFetched: string | null; // ISO string for serialization
}

const defaultState: RunwayState = {
  companyName: "Next Signal",
  cashOnHand: 0,
  monthlyRevenue: 0,
  monthlyOfficeCost: 0,
  employees: [],
  trips: [],
  expenses: [],
  revenues: [],
};

async function syncTab(tab: string, values: string[][]) {
  const { sheetId, lastFetched } = useRunwayStore.getState();
  if (!sheetId || !lastFetched) return;
  try {
    const { writeTabToSheet } = await import("@/lib/google-sheets");
    await writeTabToSheet(sheetId, tab, values);
  } catch (e) {
    console.error(`Failed to sync ${tab}:`, e);
  }
}

export const useRunwayStore = create<RunwayStore>()(
  persist(
    (set, get) => ({
      ...defaultState,
      sheetId: "",
      brexToken: "",
      brexSyncing: false,
      brexLastSynced: null,
      loading: false,
      error: null,
      lastFetched: null,

      setSheetId: (id) => set({ sheetId: id }),

      setSheetData: (data) =>
        set({
          companyName: data.companyName,
          cashOnHand: data.cashOnHand,
          monthlyRevenue: data.monthlyRevenue,
          monthlyOfficeCost: data.monthlyOfficeCost,
          employees: data.employees,
          trips: data.trips,
          expenses: data.expenses,
          revenues: data.revenues,
        }),

      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setLastFetched: (date) =>
        set({ lastFetched: date ? date.toISOString() : null }),

      // --- Employee mutations ---
      addEmployee: (employee) => {
        const newEmployee: Employee = { ...employee, id: crypto.randomUUID() };
        set((state) => ({ employees: [...state.employees, newEmployee] }));
        import("@/lib/google-sheets").then(({ employeesToRows }) => {
          syncTab("Employees", employeesToRows(get().employees));
        });
      },

      removeEmployee: (id) => {
        set((state) => ({
          employees: state.employees.filter((e) => e.id !== id),
        }));
        import("@/lib/google-sheets").then(({ employeesToRows }) => {
          syncTab("Employees", employeesToRows(get().employees));
        });
      },

      removeEmployees: (ids) => {
        const idSet = new Set(ids);
        set((state) => ({
          employees: state.employees.filter((e) => !idSet.has(e.id)),
        }));
        import("@/lib/google-sheets").then(({ employeesToRows }) => {
          syncTab("Employees", employeesToRows(get().employees));
        });
      },

      // --- Trip mutations ---
      addTrip: (trip) => {
        const newTrip: Trip = { ...trip, id: crypto.randomUUID() };
        set((state) => ({ trips: [...state.trips, newTrip] }));
        import("@/lib/google-sheets").then(({ tripsToRows }) => {
          syncTab("Trips", tripsToRows(get().trips));
        });
      },

      removeTrip: (id) => {
        set((state) => ({
          trips: state.trips.filter((t) => t.id !== id),
        }));
        import("@/lib/google-sheets").then(({ tripsToRows }) => {
          syncTab("Trips", tripsToRows(get().trips));
        });
      },

      removeTrips: (ids) => {
        const idSet = new Set(ids);
        set((state) => ({
          trips: state.trips.filter((t) => !idSet.has(t.id)),
        }));
        import("@/lib/google-sheets").then(({ tripsToRows }) => {
          syncTab("Trips", tripsToRows(get().trips));
        });
      },

      // --- Expense mutations ---
      addExpense: (expense) => {
        const newExpense: Expense = { ...expense, id: crypto.randomUUID() };
        set((state) => ({ expenses: [...state.expenses, newExpense] }));
        import("@/lib/google-sheets").then(({ expensesToRows }) => {
          syncTab("Expenses", expensesToRows(get().expenses));
        });
      },

      removeExpense: (id) => {
        set((state) => ({
          expenses: state.expenses.filter((e) => e.id !== id),
        }));
        import("@/lib/google-sheets").then(({ expensesToRows }) => {
          syncTab("Expenses", expensesToRows(get().expenses));
        });
      },

      removeExpenses: (ids) => {
        const idSet = new Set(ids);
        set((state) => ({
          expenses: state.expenses.filter((e) => !idSet.has(e.id)),
        }));
        import("@/lib/google-sheets").then(({ expensesToRows }) => {
          syncTab("Expenses", expensesToRows(get().expenses));
        });
      },

      // --- Revenue mutations ---
      addRevenue: (revenue) => {
        const newRevenue: Revenue = { ...revenue, id: crypto.randomUUID() };
        set((state) => ({ revenues: [...state.revenues, newRevenue] }));
        import("@/lib/google-sheets").then(({ revenuesToRows }) => {
          syncTab("Revenue", revenuesToRows(get().revenues));
        });
      },

      removeRevenue: (id) => {
        set((state) => ({
          revenues: state.revenues.filter((r) => r.id !== id),
        }));
        import("@/lib/google-sheets").then(({ revenuesToRows }) => {
          syncTab("Revenue", revenuesToRows(get().revenues));
        });
      },

      removeRevenues: (ids) => {
        const idSet = new Set(ids);
        set((state) => ({
          revenues: state.revenues.filter((r) => !idSet.has(r.id)),
        }));
        import("@/lib/google-sheets").then(({ revenuesToRows }) => {
          syncTab("Revenue", revenuesToRows(get().revenues));
        });
      },

      // --- Brex ---
      setBrexToken: (token) => set({ brexToken: token }),

      syncBrex: async () => {
        const { brexToken } = get();
        if (!brexToken) return;
        set({ brexSyncing: true, error: null });
        try {
          const { syncFromBrex } = await import("@/lib/brex");
          const result = await syncFromBrex(brexToken);

          // Replace all brex-sourced expenses with fresh data, keep manual ones
          const manualExpenses = get().expenses.filter((e) => e.source !== "brex");
          const allExpenses = [...manualExpenses, ...result.expenses];
          set({
            expenses: allExpenses,
            cashOnHand: result.cashBalance,
            brexLastSynced: new Date().toISOString(),
          });

          // Sync to Google Sheet
          const { expensesToRows, settingsToRows } = await import("@/lib/google-sheets");
          const s = get();
          syncTab("Expenses", expensesToRows(s.expenses));
          syncTab("Settings", settingsToRows({
            cashOnHand: s.cashOnHand,
            monthlyRevenue: s.monthlyRevenue,
            monthlyOfficeCost: s.monthlyOfficeCost,
          }));
        } catch (e) {
          set({ error: e instanceof Error ? e.message : "Brex sync failed" });
        } finally {
          set({ brexSyncing: false });
        }
      },

      // --- Settings mutations ---
      setCashOnHand: (amount) => {
        set({ cashOnHand: amount });
        import("@/lib/google-sheets").then(({ settingsToRows }) => {
          const s = get();
          syncTab(
            "Settings",
            settingsToRows({
              cashOnHand: s.cashOnHand,
              monthlyRevenue: s.monthlyRevenue,
              monthlyOfficeCost: s.monthlyOfficeCost,
            }),
          );
        });
      },

      setMonthlyRevenue: (amount) => {
        set({ monthlyRevenue: amount });
        import("@/lib/google-sheets").then(({ settingsToRows }) => {
          const s = get();
          syncTab(
            "Settings",
            settingsToRows({
              cashOnHand: s.cashOnHand,
              monthlyRevenue: s.monthlyRevenue,
              monthlyOfficeCost: s.monthlyOfficeCost,
            }),
          );
        });
      },

      setMonthlyOfficeCost: (amount) => {
        set({ monthlyOfficeCost: amount });
        import("@/lib/google-sheets").then(({ settingsToRows }) => {
          const s = get();
          syncTab(
            "Settings",
            settingsToRows({
              cashOnHand: s.cashOnHand,
              monthlyRevenue: s.monthlyRevenue,
              monthlyOfficeCost: s.monthlyOfficeCost,
            }),
          );
        });
      },
    }),
    {
      name: "runway-store",
    },
  ),
);
