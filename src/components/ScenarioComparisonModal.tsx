import React from 'react';
import { X, CheckCircle2, AlertTriangle, ArrowRight, Sparkles } from 'lucide-react';
import { RetirementInputs } from '../types/retirement';
import { runRetirementSimulation } from '../utils/simulator';
import { useSimulation } from '../context/SimulationContext';

export interface ScenarioComparisonModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  baseInputs?: RetirementInputs;
  onApplyRetirementAge?: (age: number) => void;
}

export const ScenarioComparisonModal: React.FC<ScenarioComparisonModalProps> = (props) => {
  const sim = useSimulation();
  const isOpen = props.isOpen ?? sim.isCompareModalOpen;
  const onClose = props.onClose ?? (() => sim.setIsCompareModalOpen(false));
  const baseInputs = props.baseInputs ?? sim.inputs;
  const onApplyRetirementAge = props.onApplyRetirementAge ?? sim.applyRetirementAge;

  if (!isOpen) return null;

  const currentAge = baseInputs.currentAge;
  const currentRetireAge = baseInputs.retirementAge;

  // 3 Comparison scenarios: Early (-4 yrs), Selected, Delayed (+4 yrs)
  const earlyAge = Math.max(currentAge + 1, currentRetireAge - 4);
  const targetAge = currentRetireAge;
  const delayedAge = Math.min(75, currentRetireAge + 4);

  const scenarioEarly = runRetirementSimulation({ ...baseInputs, retirementAge: earlyAge });
  const scenarioTarget = runRetirementSimulation({ ...baseInputs, retirementAge: targetAge });
  const scenarioDelayed = runRetirementSimulation({ ...baseInputs, retirementAge: delayedAge });

  const scenarios = [
    {
      title: 'Early Retirement',
      tagline: 'FIRE / Coast Horizon',
      age: earlyAge,
      sim: scenarioEarly,
      color: 'sky'
    },
    {
      title: 'Current Target',
      tagline: 'Your Configured Goal',
      age: targetAge,
      sim: scenarioTarget,
      color: 'rose',
      isCurrent: true
    },
    {
      title: 'Delayed Retirement',
      tagline: 'Maximum Security & Pension Bump',
      age: delayedAge,
      sim: scenarioDelayed,
      color: 'emerald'
    }
  ];

  const formatCur = (val: number) => {
    if (Math.abs(val) >= 1000000) return `$${(val / 1000000).toFixed(2)}M`;
    return `$${Math.round(val / 1000)}k`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col transition-colors">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Retirement Age Sensitivity & Trade-Off Comparison
            </h3>
            <p className="text-xs text-slate-500">
              See the mathematical trade-off of retiring earlier versus working a few additional years
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700:text-slate-200 hover:bg-slate-100:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Column Scenario Cards */}
        <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
          {scenarios.map((sc) => {
            const summary = sc.sim.summary;
            const yearsToWork = sc.age - currentAge;
            const yearsRetired = baseInputs.lifeExpectancy - sc.age;

            return (
              <div
                key={sc.age}
                className={`rounded-2xl border p-5 flex flex-col justify-between transition relative ${
                  sc.isCurrent
                    ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20 shadow-md'
                    : 'border-slate-200 bg-white hover:border-slate-300:border-slate-700'
                }`}
              >
                {sc.isCurrent && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-600 text-white shadow-xs">
                    ACTIVE SELECTION
                  </span>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      {sc.title}
                    </span>
                    <span className="text-lg font-black text-slate-900 font-mono">
                      Age {sc.age}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{sc.tagline}</p>

                  {/* Status Banner */}
                  <div className="mt-3">
                    {summary.isFullyFunded ? (
                      <div className="flex items-center gap-1.5 p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>100% Fully Funded</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>Depletes at Age {summary.portfolioDepletionAge}</span>
                      </div>
                    )}
                  </div>

                  {/* Metrics list */}
                  <div className="mt-4 flex flex-col gap-2.5 text-xs">
                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-500">Working Years Remaining:</span>
                      <span className="font-semibold text-slate-900">{yearsToWork} years</span>
                    </div>

                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-500">Retirement Span:</span>
                      <span className="font-semibold text-slate-900">{yearsRetired} years</span>
                    </div>

                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-500">Nest Egg at Retire:</span>
                      <span className="font-mono font-bold text-slate-900">{formatCur(summary.netWorthAtRetirement)}</span>
                    </div>

                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-500">Net Worth at Life End ({baseInputs.lifeExpectancy}):</span>
                      <span className={`font-mono font-bold ${
                        summary.netWorthAtLifeExpectancy > 0 ? 'text-emerald-700' : 'text-rose-600'
                      }`}>
                        {formatCur(summary.netWorthAtLifeExpectancy)}
                      </span>
                    </div>

                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-500">Lifetime Govt Pensions:</span>
                      <span className="font-mono font-medium text-slate-800">
                        {formatCur(summary.lifetimeCppReceived + summary.lifetimeOasReceived)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">Lifetime Taxes Paid:</span>
                      <span className="font-mono font-medium text-slate-800">{formatCur(summary.lifetimeTaxesPaid)}</span>
                    </div>
                  </div>
                </div>

                {/* Apply button */}
                <div className="mt-5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      onApplyRetirementAge(sc.age);
                      onClose();
                    }}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      sc.isCurrent
                        ? 'bg-slate-200 text-slate-700 cursor-default'
                        : 'bg-slate-900 hover:bg-slate-800:bg-rose-500 text-white shadow-sm'
                    }`}
                  >
                    <span>{sc.isCurrent ? 'Currently Active' : `Set Target to Age ${sc.age}`}</span>
                    {!sc.isCurrent && <ArrowRight className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Note */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500">
          Tip: Delaying retirement by even 2 to 3 years dramatically increases nest egg size due to extra compounding and fewer years of portfolio withdrawals.
        </div>

      </div>
    </div>
  );
};
