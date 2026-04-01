"use client";

import { useState } from "react";
import { useRunwayStore } from "@/store/runway-store";
import type { Employee } from "@/types";

function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

const emptyForm: Omit<Employee, "id"> = {
  name: "",
  role: "",
  monthlySalaryUsd: 0,
  startDate: "",
  country: "",
  deelContractType: "full-time",
  deelFeeMonthly: 0,
};

export default function EmployeeManager() {
  const employees = useRunwayStore((s) => s.employees);
  const addEmployee = useRunwayStore((s) => s.addEmployee);
  const removeEmployees = useRunwayStore((s) => s.removeEmployees);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<Omit<Employee, "id">>(emptyForm);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const totalPayroll = employees.reduce((sum, e) => sum + e.monthlySalaryUsd, 0);
  const totalDeelFees = employees.reduce((sum, e) => sum + e.deelFeeMonthly, 0);
  const allSelected = employees.length > 0 && selected.size === employees.length;

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(employees.map((e) => e.id)));
  }

  function handleDeleteSelected() {
    removeEmployees([...selected]);
    setSelected(new Set());
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.role.trim()) return;
    addEmployee(form);
    setForm(emptyForm);
    setFormOpen(false);
  }

  return (
    <section className="rounded-2xl border border-zinc-700/50 bg-slate-900/80 p-6 backdrop-blur">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">
            Employees &amp; Contractors
          </h2>
          <p className="mt-0.5 text-sm text-slate-400">
            Managed via Deel &middot; {employees.length} team member
            {employees.length !== 1 && "s"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500"
            >
              Delete selected ({selected.size})
            </button>
          )}
          <button
            type="button"
            onClick={() => setFormOpen((o) => !o)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
          >
            {formOpen ? "Cancel" : "+ Add Employee"}
          </button>
        </div>
      </div>

      {/* Collapsible Add-Employee Form */}
      {formOpen && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 grid gap-4 rounded-xl border border-zinc-700/40 bg-slate-800/50 p-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-slate-400">Name</label>
            <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="rounded-lg border border-zinc-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="Jane Doe" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-slate-400">Role</label>
            <input type="text" required value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="rounded-lg border border-zinc-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="Software Engineer" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-slate-400">Monthly Salary (USD)</label>
            <input type="number" min={0} required value={form.monthlySalaryUsd || ""}
              onChange={(e) => setForm({ ...form, monthlySalaryUsd: Number(e.target.value) })}
              className="rounded-lg border border-zinc-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="8000" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-slate-400">Start Date</label>
            <input type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className="rounded-lg border border-zinc-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-slate-400">Country</label>
            <input type="text" required value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}
              className="rounded-lg border border-zinc-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="United States" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-slate-400">Deel Contract Type</label>
            <select value={form.deelContractType}
              onChange={(e) => setForm({ ...form, deelContractType: e.target.value as "full-time" | "contractor" })}
              className="rounded-lg border border-zinc-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500">
              <option value="full-time">Full-Time</option>
              <option value="contractor">Contractor</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-slate-400">Deel Fee (Monthly)</label>
            <input type="number" min={0} required value={form.deelFeeMonthly || ""}
              onChange={(e) => setForm({ ...form, deelFeeMonthly: Number(e.target.value) })}
              className="rounded-lg border border-zinc-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="49" />
          </div>
          <div className="flex items-end sm:col-span-2 lg:col-span-2">
            <button type="submit" className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-emerald-500">
              Add Employee
            </button>
          </div>
        </form>
      )}

      {/* Employee Table */}
      {employees.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-700/60 py-12 text-center">
          <p className="text-sm text-slate-500">
            No team members yet. Click <strong>+ Add Employee</strong> above to get started.
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
                <th className="pb-3 pr-4 font-medium">Name</th>
                <th className="pb-3 pr-4 font-medium">Role</th>
                <th className="pb-3 pr-4 font-medium text-right">Salary</th>
                <th className="pb-3 pr-4 font-medium">Country</th>
                <th className="pb-3 pr-4 font-medium">Contract</th>
                <th className="pb-3 pr-4 font-medium text-right">Deel Fee</th>
                <th className="pb-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {employees.map((emp) => (
                <tr key={emp.id} className={`group transition hover:bg-slate-800/40 ${selected.has(emp.id) ? "bg-slate-800/60" : ""}`}>
                  <td className="py-3 pr-2">
                    <input type="checkbox" checked={selected.has(emp.id)} onChange={() => toggleSelect(emp.id)} className="accent-emerald-500" />
                  </td>
                  <td className="py-3 pr-4 font-medium text-slate-200">{emp.name}</td>
                  <td className="py-3 pr-4 text-slate-300">{emp.role}</td>
                  <td className="py-3 pr-4 text-right tabular-nums text-slate-200">{formatUsd(emp.monthlySalaryUsd)}</td>
                  <td className="py-3 pr-4 text-slate-300">{emp.country}</td>
                  <td className="py-3 pr-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      emp.deelContractType === "full-time" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"
                    }`}>
                      {emp.deelContractType === "full-time" ? "Full-Time" : "Contractor"}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums text-slate-300">{formatUsd(emp.deelFeeMonthly)}</td>
                  <td className="py-3 text-right">
                    <button type="button"
                      onClick={() => { removeEmployees([emp.id]); setSelected((p) => { const n = new Set(p); n.delete(emp.id); return n; }); }}
                      className="rounded-md px-2 py-1 text-xs font-medium text-red-400 opacity-0 transition hover:bg-red-500/15 group-hover:opacity-100"
                      title={`Remove ${emp.name}`}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Totals */}
      {employees.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-6 rounded-xl border border-zinc-700/40 bg-slate-800/40 px-5 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Monthly Payroll</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-100">{formatUsd(totalPayroll)}</p>
          </div>
          <div className="h-8 w-px bg-zinc-700/50" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Deel Fees</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-100">{formatUsd(totalDeelFees)}</p>
          </div>
          <div className="h-8 w-px bg-zinc-700/50" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Total Monthly Cost</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums text-indigo-400">{formatUsd(totalPayroll + totalDeelFees)}</p>
          </div>
        </div>
      )}

      <p className="mt-4 text-center text-xs text-zinc-500">Changes sync to your Google Sheet</p>
    </section>
  );
}
