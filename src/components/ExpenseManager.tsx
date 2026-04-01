"use client";

import { useState, useMemo } from "react";
import { useRunwayStore } from "@/store/runway-store";
import type { Expense, ExpenseCategory } from "@/types";

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "software", "cloud", "office", "travel", "meals",
  "equipment", "marketing", "legal", "deel", "payroll", "other",
];

function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

const EMPTY_FORM: Omit<Expense, "id"> = {
  date: new Date().toISOString().slice(0, 10),
  description: "",
  category: "software",
  amount: 0,
  vendor: "",
  source: "manual",
};

export default function ExpenseManager() {
  const expenses = useRunwayStore((s) => s.expenses);
  const addExpense = useRunwayStore((s) => s.addExpense);
  const removeExpenses = useRunwayStore((s) => s.removeExpenses);

  const [form, setForm] = useState<Omit<Expense, "id">>({ ...EMPTY_FORM });
  const [filterCategory, setFilterCategory] = useState<ExpenseCategory | "all">("all");
  const [filterSource, setFilterSource] = useState<"all" | "manual" | "brex">("all");
  const [sortField, setSortField] = useState<"date" | "amount" | "category">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    let result = [...expenses];
    if (filterCategory !== "all") result = result.filter((e) => e.category === filterCategory);
    if (filterSource !== "all") result = result.filter((e) => e.source === filterSource);
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === "date") cmp = a.date.localeCompare(b.date);
      else if (sortField === "amount") cmp = a.amount - b.amount;
      else cmp = a.category.localeCompare(b.category);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [expenses, filterCategory, filterSource, sortField, sortDir]);

  const totalFiltered = filtered.reduce((sum, e) => sum + e.amount, 0);
  const allSelected = filtered.length > 0 && selected.size === filtered.length;

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
    else setSelected(new Set(filtered.map((e) => e.id)));
  }

  function handleDeleteSelected() {
    removeExpenses([...selected]);
    setSelected(new Set());
  }

  function handleAdd() {
    if (!form.description.trim() || form.amount <= 0) return;
    addExpense({ ...form, description: form.description.trim(), vendor: form.vendor.trim() });
    setForm({ ...EMPTY_FORM });
  }

  return (
    <section className="rounded-2xl border border-zinc-700/50 bg-slate-900/80 p-6 backdrop-blur">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Expenses</h2>
          <p className="mt-0.5 text-sm text-slate-400">
            {expenses.length} expense{expenses.length !== 1 && "s"} tracked
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

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value as ExpenseCategory | "all")}
          className="rounded-lg border border-zinc-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 outline-none"
        >
          <option value="all">All Categories</option>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </select>
        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value as "all" | "manual" | "brex")}
          className="rounded-lg border border-zinc-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 outline-none"
        >
          <option value="all">All Sources</option>
          <option value="manual">Manual</option>
          <option value="brex">Brex</option>
        </select>
      </div>

      {/* Inline add form */}
      <div className="mb-5 flex flex-wrap items-end gap-2 rounded-xl border border-zinc-700/40 bg-slate-800/50 p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Date</label>
          <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            className="rounded-lg border border-zinc-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 outline-none" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Description</label>
          <input type="text" placeholder="e.g. AWS monthly" value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="rounded-lg border border-zinc-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 outline-none" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Category</label>
          <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as ExpenseCategory }))}
            className="rounded-lg border border-zinc-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 outline-none">
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Amount ($)</label>
          <input type="number" min={0} step={1} placeholder="0" value={form.amount || ""}
            onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))}
            className="w-28 rounded-lg border border-zinc-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 outline-none" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Vendor</label>
          <input type="text" placeholder="e.g. Amazon" value={form.vendor}
            onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))}
            className="rounded-lg border border-zinc-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 outline-none" />
        </div>
        <button onClick={handleAdd} disabled={!form.description.trim() || form.amount <= 0}
          className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40">
          Add
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-700/60 py-12 text-center">
          <p className="text-sm text-slate-500">
            No expenses{filterCategory !== "all" || filterSource !== "all" ? " matching filters" : ""}. Use the form above to add one.
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
                <th className="cursor-pointer pb-3 pr-4 font-medium hover:text-slate-200" onClick={() => toggleSort("category")}>
                  Category{sortIndicator("category")}
                </th>
                <th className="cursor-pointer pb-3 pr-4 font-medium text-right hover:text-slate-200" onClick={() => toggleSort("amount")}>
                  Amount{sortIndicator("amount")}
                </th>
                <th className="pb-3 pr-4 font-medium">Vendor</th>
                <th className="pb-3 pr-4 font-medium">Source</th>
                <th className="pb-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filtered.map((exp) => (
                <tr key={exp.id} className={`group transition hover:bg-slate-800/40 ${selected.has(exp.id) ? "bg-slate-800/60" : ""}`}>
                  <td className="py-3 pr-2">
                    <input type="checkbox" checked={selected.has(exp.id)} onChange={() => toggleSelect(exp.id)} className="accent-emerald-500" />
                  </td>
                  <td className="py-3 pr-4 tabular-nums text-slate-300">{exp.date}</td>
                  <td className="py-3 pr-4 text-slate-200">{exp.description}</td>
                  <td className="py-3 pr-4">
                    <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-slate-300">{exp.category}</span>
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums text-slate-200">{formatUsd(exp.amount)}</td>
                  <td className="py-3 pr-4 text-slate-400">{exp.vendor}</td>
                  <td className="py-3 pr-4">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      exp.source === "brex" ? "bg-orange-500/15 text-orange-400" : "bg-blue-500/15 text-blue-400"
                    }`}>
                      {exp.source === "brex" ? "Brex" : "Manual"}
                    </span>
                  </td>
                  <td className="py-3">
                    <button onClick={() => { removeExpenses([exp.id]); setSelected((p) => { const n = new Set(p); n.delete(exp.id); return n; }); }}
                      className="rounded-md px-2 py-1 text-xs text-red-400 opacity-0 transition hover:bg-red-500/15 group-hover:opacity-100">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="mt-5 rounded-xl border border-zinc-700/40 bg-slate-800/40 px-5 py-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              {filtered.length} expense{filtered.length !== 1 && "s"} &middot; Total
            </p>
            <p className="text-lg font-semibold tabular-nums text-rose-400">{formatUsd(totalFiltered)}</p>
          </div>
        </div>
      )}

      <p className="mt-4 text-center text-xs text-zinc-500">Changes sync to your Google Sheet</p>
    </section>
  );
}
