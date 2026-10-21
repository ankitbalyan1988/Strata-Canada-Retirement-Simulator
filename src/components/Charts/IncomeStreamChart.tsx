import React, { useState } from 'react';
import { YearSimulationResult } from '../../types/retirement';
import { Wallet, AlertCircle, TrendingDown } from 'lucide-react';

interface IncomeStreamChartProps {
  yearlyResults: YearSimulationResult[];
  retirementAge: number;
}

export const IncomeStreamChart: React.FC<IncomeStreamChartProps> = ({
  yearlyResults,
  retirementAge
}) => {
  const [hoveredAge, setHoveredAge] = useState<number | null>(null);

  // Filter to retirement years only
  const retirementData = yearlyResults.filter((y) => y.isRetired);

  if (retirementData.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-200 text-center text-slate-500 text-sm">
        Select a retirement age below life expectancy to view post-retirement cash flow breakdown.
      </div>
    );
  }

  // Find max gross income for scale
  const maxIncome = Math.max(
    50000,
    ...retirementData.map((d) => {
      return (
        d.cppIncome +
        d.oasNetIncome +
        d.rrspWithdrawal +
        d.tfsaWithdrawal +
        d.nonRegWithdrawal
      );
    }),
    ...retirementData.map((d) => d.targetSpendingNominal)
  );

  const yDomainMax = Math.ceil((maxIncome * 1.15) / 10000) * 10000;

  // SVG dimensions
  const svgWidth = 860;
  const svgHeight = 320;
  const padding = { top: 35, right: 30, bottom: 45, left: 75 };
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  const minAge = retirementData[0].age;
  const maxAge = retirementData[retirementData.length - 1].age;
  const ageSpan = Math.max(1, maxAge - minAge);

  const getX = (age: number) => {
    return padding.left + ((age - minAge) / ageSpan) * chartWidth;
  };

  const getY = (value: number) => {
    const clamped = Math.max(0, value);
    return padding.top + chartHeight - (clamped / yDomainMax) * chartHeight;
  };

  // Target spending reference line path
  const targetSpendingPoints = retirementData
    .map((d) => `${getX(d.age)},${getY(d.targetSpendingNominal)}`)
    .join(' ');

  const yTicks = [0, 0.25, 0.5, 0.75, 1.0].map((frac) => frac * yDomainMax);
  const xTicks = retirementData.filter(
    (d) => d.age % 5 === 0 || d.age === minAge || d.age === maxAge
  );

  const hoveredItem = hoveredAge !== null ? retirementData.find(d => d.age === hoveredAge) : null;

  const formatCur = (val: number) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(2)}M`;
    return `$${Math.round(val / 1000)}k`;
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex flex-col gap-4 transition-colors">
      
      {/* Title & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <Wallet className="w-4 h-4" />
            </span>
            <h3 className="font-bold text-slate-900 text-base">
              Post-Retirement Income Streams & Cash Flow
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Year-by-year cash flow sources: Government pensions (CPP, OAS) and Account Drawdowns vs Target Spending
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-700"></span>
            CPP
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
            <span className="w-2.5 h-2.5 rounded-sm bg-sky-500"></span>
            OAS (Net)
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
            <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500"></span>
            RRSP/RRIF Draw
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>
            TFSA (Tax-Free)
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
            <span className="w-2.5 h-2.5 rounded-sm bg-purple-500"></span>
            Non-Reg Draw
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
            <span className="w-3 h-0.5 bg-rose-600"></span>
            Target Spending
          </span>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative w-full overflow-x-auto pb-1">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto min-w-[620px] select-none"
        >
          {/* Y Grid */}
          {yTicks.map((val) => {
            const y = getY(val);
            return (
              <g key={val}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={svgWidth - padding.right}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 10}
                  y={y + 3.5}
                  textAnchor="end"
                  className="text-[10px] fill-slate-400 font-mono"
                >
                  {formatCur(val)}
                </text>
              </g>
            );
          })}

          {/* X Axis */}
          {xTicks.map((d) => {
            const x = getX(d.age);
            return (
              <g key={d.age}>
                <line
                  x1={x}
                  y1={padding.top + chartHeight}
                  x2={x}
                  y2={padding.top + chartHeight + 6}
                  stroke="#cbd5e1"
                  strokeWidth="1.5"
                />
                <text
                  x={x}
                  y={padding.top + chartHeight + 18}
                  textAnchor="middle"
                  className="text-[10px] fill-slate-500 font-mono font-medium"
                >
                  Age {d.age}
                </text>
              </g>
            );
          })}

          {/* Stacked Bars for each retirement year */}
          {retirementData.map((d) => {
            const x = getX(d.age);
            const barWidth = Math.max(4, (chartWidth / retirementData.length) * 0.72);

            let stackBottom = padding.top + chartHeight;

            // 1. CPP
            const cppHeight = (d.cppIncome / yDomainMax) * chartHeight;
            const cppY = stackBottom - cppHeight;
            stackBottom = cppY;

            // 2. OAS Net
            const oasHeight = (d.oasNetIncome / yDomainMax) * chartHeight;
            const oasY = stackBottom - oasHeight;
            stackBottom = oasY;

            // 3. RRSP Drawdown
            const rrspHeight = (d.rrspWithdrawal / yDomainMax) * chartHeight;
            const rrspY = stackBottom - rrspHeight;
            stackBottom = rrspY;

            // 4. Non-Reg Drawdown
            const nonRegHeight = (d.nonRegWithdrawal / yDomainMax) * chartHeight;
            const nonRegY = stackBottom - nonRegHeight;
            stackBottom = nonRegY;

            // 5. TFSA Drawdown
            const tfsaHeight = (d.tfsaWithdrawal / yDomainMax) * chartHeight;
            const tfsaY = stackBottom - tfsaHeight;

            const isHovered = hoveredAge === d.age;

            return (
              <g
                key={d.age}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredAge(d.age)}
                onMouseLeave={() => setHoveredAge(null)}
              >
                {/* Hit test */}
                <rect
                  x={x - (chartWidth / retirementData.length) / 2}
                  y={padding.top}
                  width={chartWidth / retirementData.length}
                  height={chartHeight}
                  fill="transparent"
                />

                {/* CPP */}
                {cppHeight > 0 && (
                  <rect
                    x={x - barWidth / 2}
                    y={cppY}
                    width={barWidth}
                    height={cppHeight}
                    fill="#1d4ed8"
                    opacity={isHovered ? 1 : 0.85}
                  />
                )}

                {/* OAS */}
                {oasHeight > 0 && (
                  <rect
                    x={x - barWidth / 2}
                    y={oasY}
                    width={barWidth}
                    height={oasHeight}
                    fill="#0ea5e9"
                    opacity={isHovered ? 1 : 0.85}
                  />
                )}

                {/* RRSP/RRIF */}
                {rrspHeight > 0 && (
                  <rect
                    x={x - barWidth / 2}
                    y={rrspY}
                    width={barWidth}
                    height={rrspHeight}
                    fill="#6366f1"
                    opacity={isHovered ? 1 : 0.85}
                  />
                )}

                {/* Non-Reg */}
                {nonRegHeight > 0 && (
                  <rect
                    x={x - barWidth / 2}
                    y={nonRegY}
                    width={barWidth}
                    height={nonRegHeight}
                    fill="#a855f7"
                    opacity={isHovered ? 1 : 0.85}
                  />
                )}

                {/* TFSA */}
                {tfsaHeight > 0 && (
                  <rect
                    x={x - barWidth / 2}
                    y={tfsaY}
                    width={barWidth}
                    height={tfsaHeight}
                    fill="#10b981"
                    opacity={isHovered ? 1 : 0.85}
                    rx="1"
                  />
                )}

                {/* Shortfall red cap indicator if portfolio exhausted */}
                {d.cashflowGap > 0 && (
                  <rect
                    x={x - barWidth / 2}
                    y={padding.top + chartHeight - ((d.targetSpendingNominal / yDomainMax) * chartHeight)}
                    width={barWidth}
                    height={((d.cashflowGap / yDomainMax) * chartHeight)}
                    fill="#ef4444"
                    opacity="0.35"
                    stroke="#dc2626"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                )}
              </g>
            );
          })}

          {/* Target Spending Line */}
          <polyline
            fill="none"
            stroke="#e11d48"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="5 3"
            points={targetSpendingPoints}
          />
        </svg>

        {/* Floating Tooltip */}
        {hoveredItem && (
          <div
            className="absolute z-20 top-2 pointer-events-none transition-all duration-75 shadow-lg rounded-xl bg-slate-900/95 text-white p-3 border border-slate-700 text-xs backdrop-blur-sm"
            style={{
              left: `${Math.min(
                70,
                Math.max(5, ((hoveredItem.age - minAge) / ageSpan) * 100)
              )}%`
            }}
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-700/80 pb-1.5 mb-1.5">
              <span className="font-bold text-sm text-slate-100">
                Age {hoveredItem.age} Cash Flow
              </span>
              <span className="text-[11px] font-mono text-rose-400">
                Target: ${hoveredItem.targetSpendingNominal.toLocaleString()}
              </span>
            </div>

            <div className="flex flex-col gap-1 text-[11px] font-mono">
              <div className="flex justify-between text-blue-400">
                <span>CPP Benefit:</span>
                <span>${hoveredItem.cppIncome.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sky-400">
                <span>OAS Net:</span>
                <span>
                  ${hoveredItem.oasNetIncome.toLocaleString()}
                  {hoveredItem.oasClawback > 0 && ` (-$${hoveredItem.oasClawback} clawback)`}
                </span>
              </div>
              <div className="flex justify-between text-indigo-400">
                <span>RRSP / RRIF Draw:</span>
                <span>${hoveredItem.rrspWithdrawal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-purple-400">
                <span>Non-Reg Draw:</span>
                <span>${hoveredItem.nonRegWithdrawal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-emerald-400 font-semibold">
                <span>TFSA Draw (Tax-Free):</span>
                <span>${hoveredItem.tfsaWithdrawal.toLocaleString()}</span>
              </div>
              <div className="border-t border-slate-700 pt-1 mt-0.5 flex justify-between text-rose-300">
                <span>Estimated Tax Paid:</span>
                <span>${hoveredItem.totalTaxPaid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-200 font-bold">
                <span>Net Spendable Cash:</span>
                <span>${hoveredItem.netSpendableCashflow.toLocaleString()}</span>
              </div>
              {hoveredItem.cashflowGap > 0 && (
                <div className="flex justify-between text-red-400 font-bold bg-red-950/60 p-1 rounded">
                  <span>Spending Gap:</span>
                  <span>-${hoveredItem.cashflowGap.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
