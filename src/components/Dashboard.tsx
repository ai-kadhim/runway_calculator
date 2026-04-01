"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useRunwayStore } from "@/store/runway-store";
import { calculateRunway } from "@/lib/calculations";
import type { RunwayState } from "@/types";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const fmt = (n: number) =>
  isFinite(n)
    ? n.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      })
    : "---";

const fmtShort = (n: number) => {
  if (!isFinite(n)) return "---";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

const PIE_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#ef4444", // red
  "#10b981", // emerald
  "#f97316", // orange
  "#ec4899", // pink
  "#14b8a6", // teal
  "#a855f7", // purple
  "#eab308", // yellow
];

const CATEGORY_LABELS: Record<string, string> = {
  software: "Software",
  cloud: "Cloud / Hosting",
  office: "Office",
  travel: "Travel",
  meals: "Meals",
  equipment: "Equipment",
  marketing: "Marketing",
  legal: "Legal",
  deel: "Deel Fees",
  payroll: "Payroll",
  other: "Other",
};

function runwayStatusColor(months: number) {
  if (!isFinite(months)) return "text-emerald-400";
  if (months > 12) return "text-emerald-400";
  if (months >= 6) return "text-yellow-400";
  return "text-rose-400";
}

function runwayStatusBg(months: number) {
  if (!isFinite(months)) return "bg-emerald-500/20";
  if (months > 12) return "bg-emerald-500/20";
  if (months >= 6) return "bg-yellow-500/20";
  return "bg-rose-500/20";
}

function runwayStatusLabel(months: number) {
  if (!isFinite(months)) return "Sustainable";
  if (months > 12) return "Healthy";
  if (months >= 6) return "Caution";
  return "Critical";
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

function MetricCard({
  label,
  value,
  sub,
  accent = "text-slate-100",
  editable,
  onChange,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  editable?: boolean;
  onChange?: (v: number) => void;
}) {
  return (
    <div className="rounded-2xl bg-slate-800/60 border border-slate-700/50 p-5 flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
        {label}
      </span>
      {editable ? (
        <input
          type="number"
          className={`bg-transparent ${accent} text-2xl font-bold w-full outline-none border-b border-dashed border-slate-600 focus:border-blue-400 transition-colors`}
          value={value.replace(/[^0-9.-]/g, "")}
          onChange={(e) => onChange?.(Number(e.target.value) || 0)}
        />
      ) : (
        <span className={`text-2xl font-bold ${accent}`}>{value}</span>
      )}
      {sub && <span className="text-xs text-slate-500">{sub}</span>}
    </div>
  );
}

function BreakdownBar({
  label,
  amount,
  max,
  color,
}: {
  label: string;
  amount: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.min((amount / max) * 100, 100) : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-300">{label}</span>
        <span className="text-slate-400 font-mono">{fmt(amount)}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-700/50 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Dashboard                                                         */
/* ------------------------------------------------------------------ */

export default function Dashboard() {
  const store = useRunwayStore();
  const { cashOnHand, setCashOnHand, setMonthlyOfficeCost } = store;

  // Build the pure state snapshot for calculation
  const state: RunwayState = useMemo(
    () => ({
      companyName: store.companyName,
      cashOnHand: store.cashOnHand,
      monthlyRevenue: store.monthlyRevenue,
      revenues: store.revenues,
      monthlyOfficeCost: store.monthlyOfficeCost,
      employees: store.employees,
      trips: store.trips,
      expenses: store.expenses,
    }),
    [
      store.companyName,
      store.cashOnHand,
      store.monthlyRevenue,
      store.revenues,
      store.monthlyOfficeCost,
      store.employees,
      store.trips,
      store.expenses,
    ],
  );

  const calc = useMemo(() => calculateRunway(state), [state]);

  /* ---------- projected cash chart data ---------- */
  const cashProjection = useMemo(() => {
    if (!isFinite(calc.runwayMonths) || calc.netBurn <= 0) {
      // If sustainable, show 24 months of flat/growing cash
      const months = 24;
      const data = [];
      const now = new Date();
      for (let i = 0; i <= months; i++) {
        const d = new Date(now);
        d.setMonth(d.getMonth() + i);
        const label = d.toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        });
        const balance = cashOnHand - calc.netBurn * i;
        data.push({ month: label, balance: Math.max(0, Math.round(balance)) });
      }
      return data;
    }

    const months = Math.ceil(calc.runwayMonths) + 1;
    const data = [];
    const now = new Date();
    for (let i = 0; i <= months; i++) {
      const d = new Date(now);
      d.setMonth(d.getMonth() + i);
      const label = d.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      });
      const balance = cashOnHand - calc.netBurn * i;
      data.push({ month: label, balance: Math.max(0, Math.round(balance)) });
    }
    return data;
  }, [cashOnHand, calc]);

  /* ---------- pie chart data ---------- */
  const expenseCategorySlices = useMemo(() => {
    return Object.entries(calc.expensesByCategory)
      .filter(([, value]) => value > 0)
      .map(([cat, value]) => ({
        name: CATEGORY_LABELS[cat] ?? cat,
        value,
      }));
  }, [calc.expensesByCategory]);

  const pieData = useMemo(() => {
    const slices = [
      { name: "Payroll (team)", value: calc.monthlyPayroll },
      { name: "Deel Fees (team)", value: calc.monthlyDeelFees },
      { name: "Office Costs", value: calc.monthlyOfficeCosts },
      { name: "Trips", value: calc.monthlyTripsCost },
      ...expenseCategorySlices,
    ];
    return slices.filter((s) => s.value > 0);
  }, [calc, expenseCategorySlices]);

  const allBreakdownValues = [
    calc.monthlyPayroll,
    calc.monthlyDeelFees,
    calc.monthlyOfficeCosts,
    calc.monthlyTripsCost,
    ...Object.values(calc.expensesByCategory),
  ];
  const maxBreakdown = Math.max(...allBreakdownValues, 1);

  const runwayLabel = isFinite(calc.runwayMonths)
    ? `${calc.runwayMonths.toFixed(1)} months`
    : "Infinite";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        {/* ---- Header ---- */}
        <header className="space-y-2">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400 bg-clip-text text-transparent">
            Next Signal Runway Calculator
          </h1>
          <p className="text-slate-400 text-lg">
            Real-time burn rate and runway projections for {store.companyName}
          </p>
        </header>

        {/* ---- Runway status badge ---- */}
        <div
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${runwayStatusBg(calc.runwayMonths)} ${runwayStatusColor(calc.runwayMonths)}`}
        >
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              !isFinite(calc.runwayMonths) || calc.runwayMonths > 12
                ? "bg-emerald-400"
                : calc.runwayMonths >= 6
                  ? "bg-yellow-400"
                  : "bg-rose-400"
            } animate-pulse`}
          />
          Runway: {runwayLabel} &mdash; {runwayStatusLabel(calc.runwayMonths)}
        </div>

        {/* ---- Key Metrics Grid ---- */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard
            label="Cash on Hand"
            value={String(cashOnHand)}
            sub={fmt(cashOnHand)}
            accent="text-blue-400"
            editable
            onChange={setCashOnHand}
          />
          <MetricCard
            label="Total Revenue"
            value={fmt(store.revenues.reduce((sum, r) => sum + r.amount, 0))}
            sub={`${store.revenues.length} entr${store.revenues.length !== 1 ? "ies" : "y"}`}
            accent="text-emerald-400"
          />
          <MetricCard
            label="Office (monthly)"
            value={String(store.monthlyOfficeCost)}
            sub={fmt(store.monthlyOfficeCost)}
            accent="text-blue-300"
            editable
            onChange={setMonthlyOfficeCost}
          />
          <MetricCard
            label="Monthly Burn Rate"
            value={fmt(calc.totalMonthlyBurn)}
            accent="text-rose-400"
          />
          <MetricCard
            label="Net Burn"
            value={fmt(calc.netBurn)}
            sub="Burn minus revenue"
            accent={calc.netBurn <= 0 ? "text-emerald-400" : "text-rose-400"}
          />
          <MetricCard
            label="Runway"
            value={runwayLabel}
            accent={runwayStatusColor(calc.runwayMonths)}
          />
          <MetricCard
            label="Runway End Date"
            value={calc.runwayDate === "Infinite" ? "N/A" : calc.runwayDate}
            accent={runwayStatusColor(calc.runwayMonths)}
          />
        </section>

        {/* ---- Charts Row ---- */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Projected Cash Balance */}
          <div className="lg:col-span-2 rounded-2xl bg-slate-800/60 border border-slate-700/50 p-6">
            <h2 className="text-lg font-semibold text-slate-200 mb-4">
              Projected Cash Balance
            </h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cashProjection}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    stroke="#475569"
                  />
                  <YAxis
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    stroke="#475569"
                    tickFormatter={fmtShort}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #334155",
                      borderRadius: "0.75rem",
                      color: "#e2e8f0",
                    }}
                    formatter={(value: number) => [fmt(value), "Cash"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="balance"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, fill: "#3b82f6" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Burn Breakdown Pie */}
          <div className="rounded-2xl bg-slate-800/60 border border-slate-700/50 p-6">
            <h2 className="text-lg font-semibold text-slate-200 mb-4">
              Burn Breakdown
            </h2>
            {pieData.length === 0 ? (
              <p className="text-slate-500 text-sm text-center mt-16">
                No expenses to display
              </p>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                    >
                      {pieData.map((_, idx) => (
                        <Cell
                          key={idx}
                          fill={PIE_COLORS[idx % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #334155",
                        borderRadius: "0.75rem",
                        color: "#e2e8f0",
                      }}
                      formatter={(value: number) => fmt(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            {/* Legend */}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 justify-center">
              {pieData.map((s, idx) => (
                <div key={s.name} className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor: PIE_COLORS[idx % PIE_COLORS.length],
                    }}
                  />
                  {s.name}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---- Burn Breakdown Bars ---- */}
        <section className="rounded-2xl bg-slate-800/60 border border-slate-700/50 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-200">
            Monthly Burn Breakdown
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            <BreakdownBar
              label="Payroll (team)"
              amount={calc.monthlyPayroll}
              max={maxBreakdown}
              color="#6366f1"
            />
            <BreakdownBar
              label="Deel Fees (team)"
              amount={calc.monthlyDeelFees}
              max={maxBreakdown}
              color="#8b5cf6"
            />
            <BreakdownBar
              label="Office Costs"
              amount={calc.monthlyOfficeCosts}
              max={maxBreakdown}
              color="#3b82f6"
            />
            <BreakdownBar
              label="Trip Costs"
              amount={calc.monthlyTripsCost}
              max={maxBreakdown}
              color="#f59e0b"
            />
            {expenseCategorySlices.map((slice, idx) => (
              <BreakdownBar
                key={slice.name}
                label={slice.name}
                amount={slice.value}
                max={maxBreakdown}
                color={PIE_COLORS[(idx + 4) % PIE_COLORS.length]}
              />
            ))}
          </div>
          <div className="pt-3 border-t border-slate-700/50 flex items-center justify-between text-sm">
            <span className="text-slate-300 font-medium">Total Monthly Burn</span>
            <span className="text-rose-400 font-bold font-mono text-base">
              {fmt(calc.totalMonthlyBurn)}
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
