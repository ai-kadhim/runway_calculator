"use client";

import { useState } from "react";
import { useRunwayStore } from "@/store/runway-store";
import type { Trip } from "@/types";

function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

const emptyForm: Omit<Trip, "id"> = {
  description: "",
  destination: "",
  startDate: "",
  endDate: "",
  flights: 0,
  hotels: 0,
  perDiem: 0,
  otherCosts: 0,
};

export default function TripManager() {
  const trips = useRunwayStore((s) => s.trips);
  const addTrip = useRunwayStore((s) => s.addTrip);
  const removeTrips = useRunwayStore((s) => s.removeTrips);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Omit<Trip, "id">>(emptyForm);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const totalCost = trips.reduce(
    (sum, t) => sum + t.flights + t.hotels + t.perDiem + t.otherCosts, 0,
  );
  const allSelected = trips.length > 0 && selected.size === trips.length;

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(trips.map((t) => t.id)));
  }

  function handleDeleteSelected() {
    removeTrips([...selected]);
    setSelected(new Set());
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) || 0 : value,
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.destination.trim() || !form.startDate || !form.endDate) return;
    addTrip(form);
    setForm(emptyForm);
    setShowForm(false);
  }

  const inputClass =
    "w-full rounded-lg border border-zinc-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";
  const labelClass = "block text-xs font-medium text-slate-400 mb-1";

  return (
    <section className="rounded-2xl border border-zinc-700/50 bg-slate-900/80 p-6 backdrop-blur">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Trips</h2>
          <p className="mt-0.5 text-sm text-slate-400">
            {trips.length} trip{trips.length !== 1 && "s"} tracked
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="rounded-lg bg-red-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-red-500"
            >
              Delete selected ({selected.size})
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowForm((prev) => !prev)}
            className="rounded-lg border border-zinc-700 bg-slate-800/50 px-3 py-1.5 text-sm font-medium text-slate-200 transition hover:bg-slate-700/60"
          >
            {showForm ? "Cancel" : "+ Add Trip"}
          </button>
        </div>
      </div>

      {/* Add Trip Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-zinc-700/40 bg-slate-800/40 p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Destination *</label>
              <input name="destination" value={form.destination} onChange={handleChange} placeholder="e.g. San Francisco" className={inputClass} required />
            </div>
            <div>
              <label className={labelClass}>Description</label>
              <input name="description" value={form.description} onChange={handleChange} placeholder="e.g. Customer meetings" className={inputClass} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Start Date *</label>
              <input name="startDate" type="date" value={form.startDate} onChange={handleChange} className={inputClass} required />
            </div>
            <div>
              <label className={labelClass}>End Date *</label>
              <input name="endDate" type="date" value={form.endDate} onChange={handleChange} className={inputClass} required />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className={labelClass}>Flights ($)</label>
              <input name="flights" type="number" min={0} value={form.flights || ""} onChange={handleChange} placeholder="0" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Hotels ($)</label>
              <input name="hotels" type="number" min={0} value={form.hotels || ""} onChange={handleChange} placeholder="0" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Per Diem ($)</label>
              <input name="perDiem" type="number" min={0} value={form.perDiem || ""} onChange={handleChange} placeholder="0" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Other Costs ($)</label>
              <input name="otherCosts" type="number" min={0} value={form.otherCosts || ""} onChange={handleChange} placeholder="0" className={inputClass} />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500">Add Trip</button>
          </div>
        </form>
      )}

      {/* Trip List */}
      {trips.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-700/60 py-12 text-center">
          <p className="text-sm text-slate-500">
            No trips yet. Click <strong>+ Add Trip</strong> above to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Select all */}
          <div className="flex items-center gap-2 px-1">
            <input type="checkbox" checked={allSelected} onChange={toggleAll} className="accent-emerald-500" />
            <span className="text-xs text-slate-400">Select all</span>
          </div>
          {trips.map((trip) => {
            const total = trip.flights + trip.hotels + trip.perDiem + trip.otherCosts;
            return (
              <div key={trip.id} className={`rounded-xl border border-zinc-700/40 bg-slate-800/40 p-4 ${selected.has(trip.id) ? "ring-1 ring-emerald-500/50" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <input type="checkbox" checked={selected.has(trip.id)} onChange={() => toggleSelect(trip.id)}
                      className="mt-1 accent-emerald-500" />
                    <div className="min-w-0">
                      <h3 className="font-medium text-slate-200">{trip.destination}</h3>
                      {trip.description && <p className="text-sm text-slate-400">{trip.description}</p>}
                      <p className="mt-1 text-xs text-slate-500">{trip.startDate} &rarr; {trip.endDate}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-semibold tabular-nums text-slate-200">{formatUsd(total)}</span>
                    <button type="button" onClick={() => { removeTrips([trip.id]); setSelected((p) => { const n = new Set(p); n.delete(trip.id); return n; }); }}
                      className="rounded-lg p-1.5 text-slate-500 transition hover:bg-red-500/15 hover:text-red-400" title="Delete trip">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="mt-3 ml-8 flex flex-wrap gap-3 text-xs text-slate-400">
                  <span>Flights: {formatUsd(trip.flights)}</span>
                  <span>Hotels: {formatUsd(trip.hotels)}</span>
                  <span>Per Diem: {formatUsd(trip.perDiem)}</span>
                  {trip.otherCosts > 0 && <span>Other: {formatUsd(trip.otherCosts)}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Total */}
      {trips.length > 0 && (
        <div className="mt-5 rounded-xl border border-zinc-700/40 bg-slate-800/40 px-5 py-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Total Trip Costs</p>
            <p className="text-lg font-semibold tabular-nums text-amber-400">{formatUsd(totalCost)}</p>
          </div>
        </div>
      )}

      <p className="mt-4 text-center text-xs text-zinc-500">Changes sync to your Google Sheet</p>
    </section>
  );
}
