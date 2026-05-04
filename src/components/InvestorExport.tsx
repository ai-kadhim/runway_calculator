"use client";

import { useMemo, useState, useEffect } from "react";
import { useRunwayStore } from "@/store/runway-store";
import { calculateRunway } from "@/lib/calculations";
import type { RunwayState, ExpenseCategory, Revenue, Expense, Trip, Employee } from "@/types";

export default function InvestorExport() {
  const store = useRunwayStore();
  
  const [targetYear, setTargetYear] = useState<number>(2026);
  const [targetQuarter, setTargetQuarter] = useState<number>(1);

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
    ]
  );

  const calc = useMemo(() => calculateRunway(state), [state]);
  
  // ARR
  const currentARR = calc.totalMonthlyRevenue * 12;
  const [projectedARR, setProjectedARR] = useState<number>(currentARR * 1.2);

  // Cash logic
  const [customCash, setCustomCash] = useState<string>("");
  const [fundingSince, setFundingSince] = useState<number>(0);

  const estimatedQuarterEndCash = useMemo(() => {
    const targetDate = new Date(targetYear, targetQuarter * 3 - 1, 1);
    const now = new Date();
    const monthsDiff = (targetDate.getFullYear() - now.getFullYear()) * 12 + (targetDate.getMonth() - now.getMonth());
    // To estimate past cash: Current Cash - (Burn * months) - (Funding received since then)
    return store.cashOnHand - (calc.netBurn * monthsDiff) - fundingSince;
  }, [targetYear, targetQuarter, store.cashOnHand, calc.netBurn, fundingSince]);

  useEffect(() => {
    setCustomCash("");
  }, [targetQuarter, targetYear]);

  const displayCash = customCash !== "" ? Number(customCash) : estimatedQuarterEndCash;

  // Month & Quarter Calculation logic
  const monthsData = useMemo(() => {
    return [0, 1, 2].map(offset => {
       const m = (targetQuarter - 1) * 3 + offset;
       const targetDate = new Date(targetYear, m, 1);
       
       let rev = store.monthlyRevenue;
       for (const r of store.revenues) {
           const rd = new Date(r.date);
           const rStart = new Date(rd.getFullYear(), rd.getMonth(), 1);
           if (r.frequency === "one-time") {
               if (rd.getFullYear() === targetYear && rd.getMonth() === m) rev += r.amount;
           } else if (r.frequency === "monthly") {
               if (rStart <= targetDate) rev += r.amount;
           } else if (r.frequency === "annual") {
               if (rStart <= targetDate && rd.getMonth() === m) rev += r.amount;
           } else if (r.frequency === "quarterly") {
               if (rStart <= targetDate && (m - rd.getMonth()) % 3 === 0) rev += r.amount;
           }
       }

       // Ensure we only count expenses for this exact month
       const expCats: Record<ExpenseCategory, number> = {
         software: 0, cloud: 0, office: 0, travel: 0, meals: 0,
         equipment: 0, marketing: 0, legal: 0, deel: 0, payroll: 0, other: 0,
       };
       for (const e of store.expenses) {
         const d = new Date(e.date);
         // Filter: Must strictly match the requested target Year and target Month
         if (d.getFullYear() === targetYear && d.getMonth() === m) {
           expCats[e.category] += e.amount;
         }
       }

       let tripsCost = 0;
       for (const t of store.trips) {
         const d = new Date(t.startDate);
         if (d.getFullYear() === targetYear && d.getMonth() === m) {
           tripsCost += t.flights + t.hotels + t.perDiem + t.otherCosts;
         }
       }

       let payroll = 0;
       let deelFees = 0;
       for (const emp of store.employees) {
         if (!emp.startDate) continue;
         const [empYear, empMonth] = emp.startDate.split('-').map(Number);
         // Compare YYYY-MM directly
         const empDateVal = empYear * 12 + (empMonth - 1);
         const targetDateVal = targetYear * 12 + m;
         
         if (empDateVal <= targetDateVal) {
           // If they started *after* the current target month, they shouldn't hit payroll yet
           payroll += emp.monthlySalaryUsd;
           deelFees += emp.deelFeeMonthly;
         }
       }

       // Ensure we strictly isolate Employee Table payroll from manual expenses.
       // We DO NOT add expCats.payroll here anymore, so only the actual Employee tab dictates the Payroll line.
       const payrollTotal = payroll + deelFees;
       const expensesTotal = 
         expCats.cloud + expCats.software + 
         store.monthlyOfficeCost + expCats.office + 
         tripsCost + expCats.travel + 
         expCats.meals + expCats.equipment + 
         expCats.marketing + expCats.legal + 
         expCats.payroll + expCats.deel + expCats.other; // Push manual payroll tags to "Other"
       
       const total_opex = payrollTotal + expensesTotal;
       const net_income = rev - total_opex;
       
       const label = new Date(targetYear, m, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
       
       return {
         label, rev, payrollTotal, expensesTotal, total_opex, net_income
       };
    });
  }, [store, targetYear, targetQuarter]);

  const qData = useMemo(() => {
    return {
      rev: monthsData.reduce((s, m) => s + m.rev, 0),
      payrollTotal: monthsData.reduce((s, m) => s + m.payrollTotal, 0),
      expensesTotal: monthsData.reduce((s, m) => s + m.expensesTotal, 0),
      total_opex: monthsData.reduce((s, m) => s + m.total_opex, 0),
      net_income: monthsData.reduce((s, m) => s + m.net_income, 0),
    };
  }, [monthsData]);

  const handleDownloadFinancials = () => {
    // Generate P&L CSV (Month by month + Quarter Total)
    const pnlCsv = [
      [`Income Statement (Q${targetQuarter} ${targetYear})`],
      [""],
      ["Item", monthsData[0].label, monthsData[1].label, monthsData[2].label, `Q${targetQuarter} Total`],
      ["Revenue", monthsData[0].rev.toFixed(2), monthsData[1].rev.toFixed(2), monthsData[2].rev.toFixed(2), qData.rev.toFixed(2)],
      [""],
      ["Expenses"],
      ["Payroll", monthsData[0].payrollTotal.toFixed(2), monthsData[1].payrollTotal.toFixed(2), monthsData[2].payrollTotal.toFixed(2), qData.payrollTotal.toFixed(2)],
      ["Other Expenses", monthsData[0].expensesTotal.toFixed(2), monthsData[1].expensesTotal.toFixed(2), monthsData[2].expensesTotal.toFixed(2), qData.expensesTotal.toFixed(2)],
      ["Total Expenses", monthsData[0].total_opex.toFixed(2), monthsData[1].total_opex.toFixed(2), monthsData[2].total_opex.toFixed(2), qData.total_opex.toFixed(2)],
      [""],
      ["Net Income", monthsData[0].net_income.toFixed(2), monthsData[1].net_income.toFixed(2), monthsData[2].net_income.toFixed(2), qData.net_income.toFixed(2)],
    ].map(row => row.join(",")).join("\n");

    const bsCsv = [
      [`Balance Sheet (End of Q${targetQuarter} ${targetYear})`],
      [""],
      ["ASSETS"],
      ["Current Assets"],
      ["Cash and Cash Equivalents", displayCash.toFixed(2)],
      ["Total Current Assets", displayCash.toFixed(2)],
      [""],
      ["Total Assets", displayCash.toFixed(2)],
      [""],
      ["LIABILITIES & EQUITY"],
      ["Liabilities"],
      ["Total Liabilities", "0.00"],
      [""],
      ["Equity"],
      ["Total Equity", displayCash.toFixed(2)],
      [""],
      ["Total Liabilities & Equity", displayCash.toFixed(2)],
    ].map(row => row.join(",")).join("\n");

    const downloadCsv = (content: string, filename: string) => {
      const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
    };

    downloadCsv(pnlCsv, `NextSignal_Income_Statement_Q${targetQuarter}_${targetYear}.csv`);
    setTimeout(() => downloadCsv(bsCsv, `NextSignal_Balance_Sheet_Q${targetQuarter}_${targetYear}.csv`), 500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("File selected:", e.target.files);
  };

  const fmt = (n: number) =>
    isFinite(n)
      ? n.toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        })
      : "---";

  return (
    <div className="bg-slate-900 rounded-xl p-8 border border-slate-700 text-slate-200">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <h2 className="text-2xl font-bold text-white">Investor Update Export</h2>
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-400">Quarter:</label>
          <select 
            value={targetQuarter} 
            onChange={e => setTargetQuarter(Number(e.target.value))} 
            className="bg-slate-800 border border-slate-600 rounded p-2 text-white outline-none focus:border-emerald-500"
          >
            <option value={1}>Q1</option>
            <option value={2}>Q2</option>
            <option value={3}>Q3</option>
            <option value={4}>Q4</option>
          </select>
          <select 
            value={targetYear} 
            onChange={e => setTargetYear(Number(e.target.value))} 
            className="bg-slate-800 border border-slate-600 rounded p-2 text-white outline-none focus:border-emerald-500"
          >
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
          </select>
        </div>
      </div>
      
      <div className="space-y-8">
        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-800 p-4 rounded-lg border border-slate-600">
            <p className="text-sm text-slate-400 font-semibold mb-1">Ending Cash Balance $ (Q{targetQuarter} {targetYear})</p>
            <input 
              type="number" 
              value={customCash !== "" ? customCash : estimatedQuarterEndCash.toFixed(0)} 
              onChange={(e) => setCustomCash(e.target.value)}
              className="bg-slate-900 border border-slate-600 text-2xl font-bold text-white w-full p-2 rounded outline-none focus:border-emerald-500"
            />
            <p className="text-xs text-slate-500 mt-1">Estimated from current cash + burn rate.</p>
            
            <div className="mt-3 pt-3 border-t border-slate-700">
              <p className="text-xs text-slate-400 font-semibold mb-1">Funding Received Since Q{targetQuarter}? (Subtracts from estimate)</p>
              <input 
                type="number" 
                value={fundingSince || ""} 
                onChange={(e) => {
                  setFundingSince(Number(e.target.value));
                  setCustomCash(""); // Reset custom cash to allow auto-calc
                }}
                placeholder="e.g. 50000"
                className="bg-slate-900 border border-slate-600 text-sm font-bold text-emerald-400 w-full p-1.5 rounded outline-none focus:border-emerald-500"
              />
            </div>
          </div>
          
          <div className="bg-slate-800 p-4 rounded-lg border border-slate-600">
            <p className="text-sm text-slate-400 font-semibold mb-1">Projected Gross Runway</p>
            <p className="text-2xl font-bold text-white">
              {isFinite(calc.runwayMonths) ? `${calc.runwayMonths.toFixed(1)} months` : "Infinite"}
            </p>
            <p className="text-xs text-slate-500 mt-1">Calculated from current net burn (across all time).</p>
          </div>

          <div className="bg-slate-800 p-4 rounded-lg border border-slate-600">
            <p className="text-sm text-slate-400 font-semibold mb-1">Q{targetQuarter} {targetYear} Actual Revenue $</p>
            <p className="text-2xl font-bold text-white">{fmt(qData.rev)}</p>
            <p className="text-xs text-slate-500 mt-1">Actual revenue recorded for the selected quarter.</p>
          </div>

          <div className="bg-slate-800 p-4 rounded-lg border border-slate-600">
            <p className="text-sm text-slate-400 font-semibold mb-1">Current ARR $</p>
            <p className="text-2xl font-bold text-emerald-400">{fmt(currentARR)}</p>
            <p className="text-xs text-slate-500 mt-1">Total ARR calculated from current monthly recurring metrics.</p>
          </div>

          <div className="bg-slate-800 p-4 rounded-lg border border-slate-600">
            <p className="text-sm text-slate-400 font-semibold mb-1">Projected Total ARR (Next Quarter) $</p>
            <input 
              type="number" 
              value={projectedARR} 
              onChange={(e) => setProjectedARR(Number(e.target.value))}
              className="bg-slate-900 border border-slate-600 text-2xl font-bold text-emerald-400 w-full p-2 rounded outline-none focus:border-emerald-500"
            />
            <p className="text-xs text-slate-500 mt-1">Projected total ARR at the upcoming quarter end.</p>
          </div>
        </div>

        <hr className="border-slate-700" />

        {/* File Uploads */}
        <div className="space-y-6">
          <div>
            <p className="font-semibold text-white flex items-center">
              Financial Statements 
              <span className="ml-2 px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">Auto-Generated</span>
            </p>
            <p className="text-sm text-slate-400 mb-2">
              We automatically generated your month-by-month Income Statement (P&L) and Balance Sheet for Q{targetQuarter} {targetYear} based on your actual runway data.
            </p>
            <button 
              onClick={handleDownloadFinancials}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded text-sm transition-colors"
            >
              Download Month-by-Month P&L and Balance Sheet (CSV)
            </button>
          </div>

          <div>
            <p className="font-semibold text-white flex items-center">
              Recent Board Deck 
              <span className="ml-2 px-2 py-0.5 rounded text-xs font-medium bg-rose-500/20 text-rose-400 border border-rose-500/20">Required</span>
            </p>
            <p className="text-sm text-slate-400 mb-2">Please upload the most recent board or investor deck used in your latest meeting.</p>
            <input type="file" multiple max="10" onChange={handleFileUpload} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-slate-800 file:text-white hover:file:bg-slate-700 cursor-pointer" />
          </div>

          <div>
            <p className="font-semibold text-white flex items-center">
              Cap Table Updates 
              <span className="ml-2 px-2 py-0.5 rounded text-xs font-medium bg-rose-500/20 text-rose-400 border border-rose-500/20">Required</span>
            </p>
            <p className="text-sm text-slate-400 mb-2">Please upload your most recent cap table. Excel or PDF preferred.</p>
            <input type="file" multiple max="10" onChange={handleFileUpload} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-slate-800 file:text-white hover:file:bg-slate-700 cursor-pointer" />
          </div>
          
          <div>
            <p className="font-semibold text-white">Recent Wins & Updates</p>
            <p className="text-sm text-slate-400 mb-2">Keep us in the loop on your latest milestones, progress, or key updates.</p>
            <textarea className="w-full h-32 bg-slate-800 border border-slate-600 rounded p-3 text-slate-200 outline-none focus:border-blue-500" placeholder="We launched..." />
          </div>
        </div>
      </div>
    </div>
  );
}