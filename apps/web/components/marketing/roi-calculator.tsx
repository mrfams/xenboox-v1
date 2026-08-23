"use client";

import { useState } from "react";
import { Calculator, TrendingUp, Clock, DollarSign } from "lucide-react";

type Inputs = {
  employees: number;
  bookkeeperSalary: number;
  hoursPerWeekManual: number;
};

const defaults: Inputs = {
  employees: 5,
  bookkeeperSalary: 50000,
  hoursPerWeekManual: 20,
};

const salaryPresets = [
  { label: "Small team", salary: 40000 },
  { label: "Mid-size", salary: 65000 },
  { label: "Enterprise", salary: 120000 },
];

export function RoiCalculator() {
  const [inputs, setInputs] = useState<Inputs>(defaults);

  // AI reduces manual work by ~85%
  const aiEfficiency = 0.85;
  const weeksPerYear = 52;

  const manualHoursPerYear = inputs.hoursPerWeekManual * weeksPerYear;
  const aiHoursPerYear = manualHoursPerYear * (1 - aiEfficiency);
  const hoursSavedPerYear = manualHoursPerYear - aiHoursPerYear;

  const hourlyRate = inputs.bookkeeperSalary / (40 * weeksPerYear);
  const annualSavings = hoursSavedPerYear * hourlyRate * inputs.employees;
  const monthlySavings = annualSavings / 12;

  // Starter plan = $29/mo, Business = $79/mo
  const starterCost = 29 * 12;
  const starterRoi =
    starterCost > 0 ? ((annualSavings - starterCost) / starterCost) * 100 : 0;
  const monthsToRoi = monthlySavings > 0 ? Math.ceil(29 / monthlySavings) : 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/40">
          <Calculator className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            ROI Calculator
          </h3>
          <p className="text-sm text-muted-foreground">
            See how much Xenboox saves you
          </p>
        </div>
      </div>

      {/* Inputs */}
      <div className="space-y-5">
        {/* Employees */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Team size (finance/accounting)
          </label>
          <input
            type="range"
            min={1}
            max={50}
            value={inputs.employees}
            onChange={(e) =>
              setInputs({ ...inputs, employees: Number(e.target.value) })
            }
            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
            <span>1</span>
            <span className="font-medium text-foreground">
              {inputs.employees} people
            </span>
            <span>50</span>
          </div>
        </div>

        {/* Salary */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Average salary (annual)
          </label>
          <div className="flex gap-2 mb-2">
            {salaryPresets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() =>
                  setInputs({ ...inputs, bookkeeperSalary: preset.salary })
                }
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  inputs.bookkeeperSalary === preset.salary
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                    : "border-border text-muted-foreground hover:border-foreground/30"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">$</span>
            <input
              type="number"
              value={inputs.bookkeeperSalary}
              onChange={(e) =>
                setInputs({
                  ...inputs,
                  bookkeeperSalary: Number(e.target.value),
                })
              }
              className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Hours per week */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Manual accounting hours/week
          </label>
          <input
            type="range"
            min={5}
            max={60}
            value={inputs.hoursPerWeekManual}
            onChange={(e) =>
              setInputs({
                ...inputs,
                hoursPerWeekManual: Number(e.target.value),
              })
            }
            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
            <span>5h</span>
            <span className="font-medium text-foreground">
              {inputs.hoursPerWeekManual}h/week
            </span>
            <span>60h</span>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="mt-8 grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-4 text-center">
          <Clock className="h-5 w-5 text-blue-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-blue-600">
            {Math.round(hoursSavedPerYear / inputs.employees)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            hours saved/person/yr
          </p>
        </div>
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-4 text-center">
          <DollarSign className="h-5 w-5 text-emerald-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-emerald-600">
            ${Math.round(monthlySavings).toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">saved per month</p>
        </div>
        <div className="rounded-xl bg-violet-50 dark:bg-violet-900/20 p-4 text-center">
          <TrendingUp className="h-5 w-5 text-violet-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-violet-600">
            {starterRoi > 0 ? `${Math.round(starterRoi)}%` : "N/A"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            ROI vs Starter plan
          </p>
        </div>
      </div>

      {/* Payback */}
      {monthsToRoi > 0 && monthsToRoi <= 12 && (
        <div className="mt-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 text-center">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <span className="font-semibold">{`Payback in ${monthsToRoi} month${monthsToRoi > 1 ? "s" : ""}`}</span>{" "}
            — saves{" "}
            <span className="font-semibold">
              ${Math.round(annualSavings).toLocaleString()}/year
            </span>{" "}
            vs ${starterCost}/year for Starter plan
          </p>
        </div>
      )}
    </div>
  );
}
