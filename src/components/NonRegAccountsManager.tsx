import React from 'react';
import { Plus, Trash2, Calendar, Lock, TrendingUp, PiggyBank, ShieldCheck, ArrowRightLeft } from 'lucide-react';
import { CustomNonRegAccount, NonRegAccountCategory } from '../types/retirement';
import { CurrencyInput } from './CurrencyInput';

interface NonRegAccountsManagerProps {
  accounts?: CustomNonRegAccount[];
  baseBalance: number;
  baseAnnualContribution: number;
  baseReturn: number;
  onUpdate: (
    accounts: CustomNonRegAccount[],
    totalBalance: number,
    totalContrib: number,
    weightedReturn: number
  ) => void;
  onClearToSimple: (fallbackBalance: number, fallbackContrib: number) => void;
}

const CATEGORY_CONFIG: Record<
  NonRegAccountCategory,
  { label: string; icon: React.ReactNode; defaultRate: number; color: string; badgeClass: string }
> = {
  savings: {
    label: 'Savings (HISA / Cash)',
    icon: <PiggyBank className="w-3.5 h-3.5" />,
    defaultRate: 3.5,
    color: 'emerald',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200'
  },
  investment: {
    label: 'Investment (Equities / ETFs)',
    icon: <TrendingUp className="w-3.5 h-3.5" />,
    defaultRate: 7.0,
    color: 'blue',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  gic: {
    label: 'GIC (Locked Certificate)',
    icon: <Lock className="w-3.5 h-3.5" />,
    defaultRate: 4.5,
    color: 'amber',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200'
  }
};

export const NonRegAccountsManager: React.FC<NonRegAccountsManagerProps> = ({
  accounts = [],
  baseBalance,
  baseAnnualContribution,
  baseReturn,
  onUpdate,
  onClearToSimple
}) => {
  const hasCustom = accounts.length > 0;

  // Calculate cumulative stats
  const totalBalance = hasCustom
    ? accounts.reduce((sum, a) => sum + Math.max(0, a.balance || 0), 0)
    : baseBalance;

  const totalContribution = hasCustom
    ? accounts.reduce((sum, a) => sum + Math.max(0, a.annualContribution || 0), 0)
    : baseAnnualContribution;

  const weightedReturn = hasCustom
    ? totalBalance > 0
      ? Number(
          (
            accounts.reduce((sum, a) => sum + Math.max(0, a.balance || 0) * (a.expectedReturn || 0), 0) /
            totalBalance
          ).toFixed(2)
        )
      : accounts[0]?.expectedReturn || baseReturn
    : baseReturn;

  const emitUpdate = (newAccounts: CustomNonRegAccount[]) => {
    const newTotalBal = newAccounts.reduce((sum, a) => sum + Math.max(0, a.balance || 0), 0);
    const newTotalCont = newAccounts.reduce((sum, a) => sum + Math.max(0, a.annualContribution || 0), 0);
    const newWeighted =
      newTotalBal > 0
        ? Number(
            (
              newAccounts.reduce((sum, a) => sum + Math.max(0, a.balance || 0) * (a.expectedReturn || 0), 0) /
              newTotalBal
            ).toFixed(2)
          )
        : newAccounts[0]?.expectedReturn || baseReturn;

    onUpdate(newAccounts, newTotalBal, newTotalCont, newWeighted);
  };

  const handleAddAccount = (category: NonRegAccountCategory) => {
    const config = CATEGORY_CONFIG[category];
    const currentYear = 2026;

    let initialAccounts = [...accounts];
    // If transitioning from simple to custom, seed existing balance as primary account
    if (initialAccounts.length === 0 && (baseBalance > 0 || baseAnnualContribution > 0)) {
      initialAccounts.push({
        id: `nonreg-${Date.now()}-1`,
        name: 'Primary Taxable Brokerage',
        category: 'investment',
        balance: baseBalance,
        annualContribution: baseAnnualContribution,
        expectedReturn: baseReturn
      });
    }

    const newAccount: CustomNonRegAccount = {
      id: `nonreg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name:
        category === 'savings'
          ? 'High-Interest Savings Account'
          : category === 'gic'
          ? 'Guaranteed Investment Certificate (GIC)'
          : 'Taxable Investment Account',
      category,
      balance: category === 'gic' ? 10000 : 5000,
      annualContribution: category === 'gic' ? 0 : 2000,
      expectedReturn: config.defaultRate,
      gicCloseYear: category === 'gic' ? currentYear + 2 : undefined,
      gicCloseDate: category === 'gic' ? `${currentYear + 2}-12-31` : undefined
    };

    const updated = [...initialAccounts, newAccount];
    emitUpdate(updated);
  };

  const handleUpdateAccount = (id: string, updates: Partial<CustomNonRegAccount>) => {
    const updated = accounts.map((acc) => {
      if (acc.id !== id) return acc;
      const merged = { ...acc, ...updates };
      // If switching to GIC, ensure close year is set
      if (updates.category === 'gic' && !merged.gicCloseYear) {
        merged.gicCloseYear = 2028;
        merged.gicCloseDate = '2028-12-31';
      }
      return merged;
    });
    emitUpdate(updated);
  };

  const handleDeleteAccount = (id: string) => {
    const remaining = accounts.filter((a) => a.id !== id);
    if (remaining.length === 0) {
      onClearToSimple(totalBalance, totalContribution);
    } else {
      emitUpdate(remaining);
    }
  };

  return (
    <div className="p-4 rounded-xl border border-purple-100 dark:border-slate-700/80 bg-purple-50/30 dark:bg-slate-800/40 flex flex-col gap-3.5 transition-all">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Non-Registered (SA / Taxable)</span>
              <span className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-100/90 dark:bg-purple-500/20 border border-purple-200 dark:border-purple-500/30 px-2 py-0.5 rounded-full">
                Unified Non - Reg Bucket
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Taxable money outside RRSP/TFSA. All sub-accounts roll cumulatively into this single bucket.
            </p>
          </div>
        </div>

        {hasCustom && (
          <button
            type="button"
            onClick={() => onClearToSimple(totalBalance, totalContribution)}
            className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium underline flex items-center gap-1 cursor-pointer"
            title="Switch back to entering a single summary total"
          >
            <ArrowRightLeft className="w-3 h-3" />
            Switch to Single Total
          </button>
        )}
      </div>

      {/* Cumulative Bucket Badge when Custom Accounts Exist */}
      {hasCustom && (
        <div className="p-3 bg-purple-100/60 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 rounded-xl grid grid-cols-3 gap-2 text-center">
          <div>
            <span className="text-[10px] text-purple-900 dark:text-purple-300 font-semibold uppercase block">Total Balance</span>
            <span className="text-sm font-extrabold text-purple-950 dark:text-purple-100 font-mono">
              ${Math.round(totalBalance).toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-purple-900 dark:text-purple-300 font-semibold uppercase block">Total Annual Savings</span>
            <span className="text-sm font-extrabold text-purple-950 dark:text-purple-100 font-mono">
              ${Math.round(totalContribution).toLocaleString()}/yr
            </span>
          </div>
          <div>
            <span className="text-[10px] text-purple-900 dark:text-purple-300 font-semibold uppercase block">Blended Return</span>
            <span className="text-sm font-extrabold text-purple-950 dark:text-purple-100 font-mono">
              {weightedReturn}%
            </span>
          </div>
        </div>
      )}

      {/* Simple View (No Custom Sub-accounts yet) */}
      {!hasCustom ? (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">Current Balance</label>
              <CurrencyInput
                value={baseBalance}
                onChange={(val) => onClearToSimple(val, baseAnnualContribution)}
                min={0}
                step={2000}
                aria-label="Non-Registered Current Balance"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">Annual Savings</label>
              <CurrencyInput
                value={baseAnnualContribution}
                onChange={(val) => onClearToSimple(baseBalance, val)}
                min={0}
                step={1000}
                aria-label="Non-Registered Annual Savings"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-purple-800 dark:text-purple-300 block mb-1 font-semibold">Expected Return</label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={15}
                  step={0.1}
                  value={baseReturn}
                  onChange={(e) => onUpdate([], baseBalance, baseAnnualContribution, Number(e.target.value))}
                  className="w-full pl-2.5 pr-6 py-1.5 text-xs font-mono font-bold text-purple-700 dark:text-purple-300 rounded-lg border border-purple-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
                <span className="absolute right-2.5 top-2 text-xs text-purple-600 dark:text-purple-400 font-bold">%</span>
              </div>
            </div>
          </div>

          {/* Quick-add Custom Accounts Action Button */}
          <div className="pt-2 border-t border-purple-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Hold a mix of high-interest savings, investment portfolios, or locked GICs?
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleAddAccount('savings')}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-700/60 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Savings (HISA)
              </button>
              <button
                type="button"
                onClick={() => handleAddAccount('investment')}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-700/60 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Investment
              </button>
              <button
                type="button"
                onClick={() => handleAddAccount('gic')}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-700/60 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                Add GIC
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Detailed Custom Accounts Breakdown */
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2.5">
            {accounts.map((acc, index) => {
              const isGic = acc.category === 'gic';
              const config = CATEGORY_CONFIG[acc.category] || CATEGORY_CONFIG.investment;

              return (
                <div
                  key={acc.id}
                  className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-purple-100 dark:border-slate-700/80 shadow-2xs flex flex-col gap-2.5 relative transition-all"
                >
                  {/* Account Row Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                      <span className="text-[11px] font-mono font-bold text-slate-400">#{index + 1}</span>
                      <input
                        type="text"
                        value={acc.name}
                        onChange={(e) => handleUpdateAccount(acc.id, { name: e.target.value })}
                        className="text-xs font-bold text-slate-800 dark:text-slate-200 bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-500 focus:border-purple-600 focus:outline-none flex-1 py-0.5"
                        placeholder="Account Name"
                      />
                    </div>

                    {/* Category Selector Segmented Pills */}
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10px] font-semibold">
                      {(['savings', 'investment', 'gic'] as NonRegAccountCategory[]).map((cat) => {
                        const isSelected = acc.category === cat;
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => handleUpdateAccount(acc.id, { category: cat })}
                            className={`px-2 py-0.5 rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold shadow-2xs'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                          >
                            {CATEGORY_CONFIG[cat].icon}
                            <span>
                              {cat === 'savings' ? 'Savings' : cat === 'investment' ? 'Investment' : 'GIC'}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteAccount(acc.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors cursor-pointer"
                      title="Remove this account"
                      aria-label="Remove account"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Account Inputs Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {/* Current Balance */}
                    <div>
                      <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block mb-0.5">Current Balance</label>
                      <CurrencyInput
                        value={acc.balance}
                        onChange={(val) => handleUpdateAccount(acc.id, { balance: val })}
                        min={0}
                        step={1000}
                        className="text-xs font-mono font-bold"
                        aria-label={`${acc.name} Balance`}
                      />
                    </div>

                    {/* Annual Contribution */}
                    <div>
                      <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block mb-0.5">
                        {isGic ? 'Annual Addition' : 'Annual Savings'}
                      </label>
                      <CurrencyInput
                        value={acc.annualContribution}
                        onChange={(val) => handleUpdateAccount(acc.id, { annualContribution: val })}
                        min={0}
                        step={500}
                        className="text-xs font-mono font-bold"
                        aria-label={`${acc.name} Annual Contribution`}
                      />
                    </div>

                    {/* Expected Return */}
                    <div>
                      <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block mb-0.5">
                        {isGic ? 'GIC Annual Return' : 'Expected Return'}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min={0}
                          max={15}
                          step={0.1}
                          value={acc.expectedReturn}
                          onChange={(e) =>
                            handleUpdateAccount(acc.id, { expectedReturn: Number(e.target.value) })
                          }
                          className="w-full pl-2 pr-6 py-1 text-xs font-mono font-bold text-purple-800 dark:text-purple-300 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                        />
                        <span className="absolute right-2 top-1.5 text-xs text-purple-600 dark:text-purple-400 font-bold">%</span>
                      </div>
                    </div>

                    {/* GIC Specific Close Date / Maturity Year */}
                    {isGic && (
                      <div className="sm:col-span-3 lg:col-span-1 bg-amber-50/70 dark:bg-amber-500/10 p-1.5 rounded-lg border border-amber-200 dark:border-amber-500/20 flex flex-col justify-between">
                        <label className="text-[10px] font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                          GIC Close / Maturity Year
                        </label>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <select
                            value={acc.gicCloseYear || 2028}
                            onChange={(e) => {
                              const yr = Number(e.target.value);
                              handleUpdateAccount(acc.id, {
                                gicCloseYear: yr,
                                gicCloseDate: `${yr}-12-31`
                              });
                            }}
                            className="w-full py-1 px-1.5 text-xs font-mono font-bold text-amber-900 dark:text-amber-200 bg-white dark:bg-slate-950 border border-amber-300 dark:border-amber-600/40 rounded-md cursor-pointer"
                          >
                            {[2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035].map((year) => (
                              <option key={year} value={year}>
                                Year {year} ({year - 2026} yr term)
                              </option>
                            ))}
                          </select>
                        </div>
                        <span className="text-[9px] text-amber-800 dark:text-amber-300 mt-0.5 leading-tight block">
                          Principal + yield roll into liquid Non-Reg upon maturity.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add More Sub-accounts buttons */}
          <div className="pt-2 border-t border-purple-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              Compounded independently & automatically summed into the Non - Reg bucket.
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleAddAccount('savings')}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-700/60 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                + Savings (HISA)
              </button>
              <button
                type="button"
                onClick={() => handleAddAccount('investment')}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-700/60 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                + Investment
              </button>
              <button
                type="button"
                onClick={() => handleAddAccount('gic')}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700/60 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                + GIC
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
