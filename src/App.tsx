import React, { useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { Header } from './components/Header';
import { HeroRetirementSlider } from './components/HeroRetirementSlider';
import { RetirementScorecard } from './components/RetirementScorecard';
import { SavingsPulse } from './components/SavingsPulse';
import { NetWorthChart } from './components/Charts/NetWorthChart';
import { IncomeStreamChart } from './components/Charts/IncomeStreamChart';
import { InputPanel } from './components/InputPanel';
import { MilestoneTable } from './components/MilestoneTable';
import { CanadianPlanningTips } from './components/CanadianPlanningTips';
import { ScenarioComparisonModal } from './components/ScenarioComparisonModal';
import { AIPersonaModal } from './components/AIPersonaModal';
import { AIPersonaDescriptorBar } from './components/AIPersonaDescriptorBar';
import { DEFAULT_INPUTS, PRESETS } from './utils/presets';
import { CanadianProvince, RetirementInputs, ScenarioPreset } from './types/retirement';
import { runRetirementSimulation } from './utils/simulator';
import { generateRetirementPdfReport } from './utils/pdfExport';
import { Layers, Wallet, Sparkles, ShieldCheck } from 'lucide-react';

export default function App() {
  const [inputs, setInputs] = useState<RetirementInputs>(DEFAULT_INPUTS);
  const [activePresetId, setActivePresetId] = useState<string>('canadian_average');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [isAIPersonaModalOpen, setIsAIPersonaModalOpen] = useState(false);
  const [isStressTestActive, setIsStressTestActive] = useState(false);
  const [stressTiming, setStressTiming] = useState<'at_retirement' | 'immediate'>('at_retirement');
  const [activeChartTab, setActiveChartTab] = useState<'networth' | 'cashflow'>('networth');

  // Run the full baseline simulation calculation engine
  const { yearlyResults, summary } = useMemo(() => {
    return runRetirementSimulation(inputs);
  }, [inputs]);

  // Run the 10% market stress test simulation when active
  const stressSimulation = useMemo(() => {
    if (!isStressTestActive) return null;
    return runRetirementSimulation(inputs, {
      enabled: true,
      dropPercent: 10,
      timing: stressTiming
    });
  }, [inputs, isStressTestActive, stressTiming]);

  // Handlers
  const handleSelectPreset = (preset: ScenarioPreset) => {
    setInputs(preset.inputs);
    setActivePresetId(preset.id);
  };

  const handleReset = () => {
    setInputs(DEFAULT_INPUTS);
    setActivePresetId('canadian_average');
  };

  const handleApplyAIPersona = (newInputs: RetirementInputs) => {
    setInputs(newInputs);
    setActivePresetId('custom_ai');
    try {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {
      // ignore
    }
  };

  const handleRetirementAgeChange = (newAge: number) => {
    const updated = {
      ...inputs,
      retirementAge: newAge
    };
    setInputs(updated);

    // If fully funded, celebratory confetti burst
    const testSim = runRetirementSimulation(updated);
    if (testSim.summary.isFullyFunded && !summary.isFullyFunded) {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 }
        });
      } catch (e) {
        // ignore in non-browser env
      }
    }
  };

  const handleProvinceChange = (province: CanadianProvince) => {
    setInputs(prev => ({
      ...prev,
      province
    }));
  };

  const handleApplyMonthlyBoost = (additionalMonthly: number) => {
    const annualAddition = additionalMonthly * 12;
    // Direct preferentially to RRSP up to annual room, then TFSA, then Non-Reg
    const rrspRoomLeft = Math.max(0, 32490 - inputs.rrspAnnualContribution);
    const toRrsp = Math.min(annualAddition, rrspRoomLeft);
    const remainder = annualAddition - toRrsp;
    const tfsaRoomLeft = Math.max(0, 7000 - inputs.tfsaAnnualContribution);
    const toTfsa = Math.min(remainder, tfsaRoomLeft);
    const toNonReg = remainder - toTfsa;

    setInputs(prev => ({
      ...prev,
      rrspAnnualContribution: prev.rrspAnnualContribution + toRrsp,
      tfsaAnnualContribution: prev.tfsaAnnualContribution + toTfsa,
      nonRegAnnualContribution: prev.nonRegAnnualContribution + toNonReg
    }));

    try {
      confetti({
        particleCount: 55,
        spread: 65,
        origin: { y: 0.6 }
      });
    } catch (e) {
      // ignore
    }
  };

  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      // Allow UI to render spinner
      setTimeout(() => {
        generateRetirementPdfReport(inputs, summary, yearlyResults);
        setIsExportingPdf(false);
      }, 150);
    } catch (err) {
      console.error('PDF export error:', err);
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans selection:bg-rose-500 selection:text-white">
      
      {/* Top Navigation */}
      <Header
        inputs={inputs}
        activePresetId={activePresetId}
        onSelectPreset={handleSelectPreset}
        onReset={handleReset}
        onExportPdf={handleExportPdf}
        isExportingPdf={isExportingPdf}
        onOpenCompare={() => setIsCompareModalOpen(true)}
        onOpenAIPersonaModal={() => setIsAIPersonaModalOpen(true)}
        onProvinceChange={handleProvinceChange}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
        
        {/* CRA & StatCan National Benchmark Banner */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 px-4 text-xs text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base select-none">🇨🇦</span>
            <span className="font-semibold text-white">Initial Baseline:</span>
            <span className="text-slate-300">
              CRA & Statistics Canada National Averages (Avg Full-Time Salary $68.4k • TFSA $41.5k • RRSP $112k • Retire Age 64 • Life Expectancy 85 • CPP 64%)
            </span>
          </div>
          <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider bg-rose-950/80 border border-rose-800/40 px-2 py-0.5 rounded-full shrink-0 self-start sm:self-auto">
            CRA & StatCan Averages
          </span>
        </div>

        {/* AI Persona Descriptor Bar */}
        <AIPersonaDescriptorBar
          onApplyPersona={handleApplyAIPersona}
          activeProvince={inputs.province}
        />

        {/* User Inputs & Controls Panel (Household Planning Structure) */}
        <InputPanel
          inputs={inputs}
          onChange={setInputs}
        />

        {/* Hero Interactive Retirement Age Simulator */}
        <HeroRetirementSlider
          inputs={inputs}
          summary={summary}
          onChangeRetirementAge={handleRetirementAgeChange}
        />

        {/* Financial KPI Scorecard */}
        <RetirementScorecard
          inputs={inputs}
          summary={summary}
          yearlyResults={yearlyResults}
        />

        {/* Savings Pulse: Live Monthly Goal Pacing & Trajectory Comparison */}
        <SavingsPulse
          inputs={inputs}
          summary={summary}
          onApplyMonthlyBoost={handleApplyMonthlyBoost}
        />

        {/* Visual Charts Container with Tabs */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex rounded-xl bg-slate-200/80 p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveChartTab('networth')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  activeChartTab === 'networth'
                    ? 'bg-white text-slate-900 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>Net Worth Trajectory</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveChartTab('cashflow')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  activeChartTab === 'cashflow'
                    ? 'bg-white text-slate-900 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Post-Retirement Cash Flows</span>
              </button>
            </div>

            <span className="text-xs text-slate-500 hidden sm:inline">
              Hover over points to inspect Canadian account details
            </span>
          </div>

          {activeChartTab === 'networth' ? (
            <NetWorthChart
              yearlyResults={yearlyResults}
              stressYearlyResults={stressSimulation?.yearlyResults}
              retirementAge={inputs.retirementAge}
              isStressTestActive={isStressTestActive}
              onToggleStressTest={() => setIsStressTestActive(prev => !prev)}
              stressTiming={stressTiming}
              onChangeStressTiming={setStressTiming}
            />
          ) : (
            <IncomeStreamChart
              yearlyResults={yearlyResults}
              retirementAge={inputs.retirementAge}
            />
          )}
        </div>

        {/* Annual Simulation Ledger Table */}
        <MilestoneTable
          yearlyResults={yearlyResults}
          retirementAge={inputs.retirementAge}
          province={inputs.province}
          inputs={inputs}
        />

        {/* Canadian Educational Planning Guide */}
        <CanadianPlanningTips />

      </main>

      {/* Scenario Comparison Modal */}
      <ScenarioComparisonModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        baseInputs={inputs}
        onApplyRetirementAge={handleRetirementAgeChange}
      />

      {/* AI Persona Generator Modal */}
      <AIPersonaModal
        isOpen={isAIPersonaModalOpen}
        onClose={() => setIsAIPersonaModalOpen(false)}
        onApplyPersona={handleApplyAIPersona}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-base select-none">🍁</span>
            <span className="font-semibold text-slate-800">MapleRetire</span>
            <span>— Canadian Wealth & Retirement Intelligence</span>
          </div>

          <div className="text-center sm:text-right text-[11px] text-slate-400">
            Based on CRA 2025/2026 indexed tax brackets, CPP enhancements, OAS clawback formulas, and RRIF prescribed rates. For educational planning purposes.
          </div>
        </div>
      </footer>

    </div>
  );
}
