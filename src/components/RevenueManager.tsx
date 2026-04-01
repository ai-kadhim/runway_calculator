"use client";

import { useState, useMemo } from "react";
import { useRunwayStore } from "@/store/runway-store";
import type { Revenue, RevenueFrequency } from "@/types";

function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

const FREQUENCIES: { value: RevenueFrequency; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Annual" },
  { value: "one-time", label: "One-time" },
];

const EMPTY_FORM: Omit<Revenue, "id"> = {
  date: new Date().toISOString().slice(0, 10),
  description: "",
  amount: 0,
  client: "",
  frequency: "monthly",
};

export default function RevenueManager() {
  const revenues = useRunwayStore((s) => s.revenues);
  const addRevenue = useRunwayStore((s) => s.addRevenue);
  const removeRevenues = useRunwayStore((s) => s.removeRevenues);

  const [form, setForm] = useState<Omit<Revenue, "id">>({ ...EMPTY_FORM });
  const [sortField, setSortField] = useState<"date" | "amount">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const sorted = useMemo(() => {
    const result = [...revenues];
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === "date") cmp = a.date.localeCompare(b.date);
      else cmp = a.amount - b.amount;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [revenues, sortField, sortDir]);

  const total = sorted.reduce((sum, r) => sum + r.amount, 0);
  const allSelected = sorted.length > 0 && selected.size === sorted.length;

  function toggleSort(field: typeof sortField) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
  }

  const sortIndicator = (field: typeof sortField) =>
    sortField === field ? (sortDir === "asc" ? " \u2191" : " \u2193") : "";

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(sorted.map((r) => r.id)));
  }

  function handleDeleteSelected() {
    removeRevenues([...selected]);
    setSelected(new Set());
  }

  function handleAdd() {
    if (!form.description.trim() || form.amount <= 0) return;
    addRevenue({ ...form, description: form.description.trim(), client: form.client.trim() });
    setForm({ ...EMPTY_FORM });
  }

  return (
    <section className="rounded-2xl border border-zinc-700/50 bg-slate-900/80 p-6 backdrop-blur">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Revenue</h2>
          <p className="mt-0.5 text-sm text-slate-400">
            {revenues.length} revenue entr{revenues.length !== 1 ? "ies" : "y"} tracked
          </p>
        </div>
        {selected.size > 0 && (
          <button
            onClick={handleDeleteSelected}
            className="rounded-lg bg-red-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-red-500"
          >
            Delete selected ({selected.size})
          </button>
        )}
      </div>

      {/* Inline add form */}
      <div className="mb-5 flex flex-wrap items-end gap-2 rounded-xl border border-zinc-700/40 bg-slate-800/50 p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Date</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            className="rounded-lg border border-zinc-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Description</label>
          <input
            type="text"
            placeholder="e.g. Consulting project"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="rounded-lg border border-zinc-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Amount ($)</label>
          <input
            type="number"
            min={0}
            step={1}
            placeholder="0"
            value={form.amount || ""}
            onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))}
            className="w-28 rounded-lg border border-zinc-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Client</label>
          <input
            type="text"
            placeholder="e.g. Acme Corp"
            value={form.client}
            onChange={(e) => setForm((f) => ({ ...f, client: e.target.value }))}
            className="rounded-lg border border-zinc-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Frequency</label>
          <select
            value={form.frequency}
            onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value as RevenueFrequency }))}
            className="rounded-lg border border-zinc-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 outline-none"
          >
            {FREQUENCIES.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleAdd}
          disabled={!form.description.trim() || form.amount <= 0}
          className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Add
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-700/60 py-12 text-center">
          <p className="text-sm text-slate-500">
            No revenue entries. Use the form above to add one.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-700/50 text-xs uppercase tracking-wider text-slate-400">
                <th className="pb-3 pr-2 font-medium">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="accent-emerald-500" />
                </th>
                <th className="cursor-pointer pb-3 pr-4 font-medium hover:text-slate-200" onClick={() => toggleSort("date")}>
                  Date{sortIndicator("date")}
                </th>
                <th className="pb-3 pr-4 font-medium">Description</th>
                <th className="cursor-pointer pb-3 pr-4 font-medium text-right hover:text-slate-200" onClick={() => toggleSort("amount")}>
                  Amount{sortIndicator("amount")}
                </th>
                <th className="pb-3 pr-4 font-medium">Client</th>
                <th className="pb-3 pr-4 font-medium">Frequency</th>
                <th className="pb-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {sorted.map((rev) => (
                <tr key={rev.id} className={`group transition hover:bg-slate-800/40 ${selected.has(rev.id) ? "bg-slate-800/60" : ""}`}>
                  <td className="py-3 pr-2">
                    <input type="checkbox" checked={selected.has(rev.id)} onChange={() => toggleSelect(rev.id)} className="accent-emerald-500" />
                  </td>
                  <td className="py-3 pr-4 tabular-nums text-slate-300">{rev.date}</td>
                  <td className="py-3 pr-4 text-slate-200">{rev.description}</td>
                  <td className="py-3 pr-4 text-right tabular-nums text-emerald-400">{formatUsd(rev.amount)}</td>
                  <td className="py-3 pr-4 text-slate-400">{rev.client}</td>
                  <td className="py-3 pr-4">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      rev.frequency === "one-time" ? "bg-zinc-800 text-slate-400" : "bg-emerald-500/15 text-emerald-400"
                    }`}>
                      {FREQUENCIES.find((f) => f.value === rev.frequency)?.label ?? rev.frequency}
                    </span>
                  </td>
                  <td className="py-3">
                    <button
                      onClick={() => { removeRevenues([rev.id]); setSelected((p) => { const n = new Set(p); n.delete(rev.id); return n; }); }}
                      className="rounded-md px-2 py-1 text-xs text-red-400 opacity-0 transition hover:bg-red-500/15 group-hover:opacity-100"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {sorted.length > 0 && (
        <div className="mt-5 rounded-xl border border-zinc-700/40 bg-slate-800/40 px-5 py-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              {sorted.length} entr{sorted.length !== 1 ? "ies" : "y"} &middot; Total
            </p>
            <p className="text-lg font-semibold tabular-nums text-emerald-400">
              {formatUsd(total)}
            </p>
          </div>
        </div>
      )}

      <p className="mt-4 text-center text-xs text-zinc-500">
        Changes sync to your Google Sheet
      </p>
    </section>
  );
}
