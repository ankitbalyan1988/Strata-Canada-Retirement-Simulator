import React from 'react';
import { 
  FileDown, 
  RotateCcw, 
  Sparkles, 
  Scale, 
  ShieldCheck, 
  TrendingUp,
  MapPin,
  Wand2,
  Landmark
} from 'lucide-react';
import { PRESETS } from '../utils/presets';
import { CanadianProvince, RetirementInputs, ScenarioPreset } from '../types/retirement';
import { PROVINCIAL_BRACKETS } from '../utils/canadianTax';
import { PersonaHoverCard } from './PersonaHoverCard';
import { useSimulationStore } from '../store/useSimulationStore';

export interface HeaderProps {
  province?: CanadianProvince;
  activePresetId?: string;
  onSelectPreset?: (preset: ScenarioPreset) => void;
  onReset?: () => void;
  onExportPdf?: () => void;
  isExportingPdf?: boolean;
  onOpenCompare?: () => void;
  onOpenAIPersonaModal?: () => void;
  onProvinceChange?: (province: CanadianProvince) => void;
}

export const Header: React.FC<HeaderProps> = (props) => {
  // Targeted Zustand slice subscriptions
  const storeProvince = useSimulationStore((state) => state.inputs.province);
  const storeActivePresetId = useSimulationStore((state) => state.activePresetId);
  const storeIsExportingPdf = useSimulationStore((state) => state.isExportingPdf);
  const isCalculating = useSimulationStore((state) => state.isCalculating);
  const selectPreset = useSimulationStore((state) => state.selectPreset);
  const resetToDefault = useSimulationStore((state) => state.resetToDefault);
  const exportPdf = useSimulationStore((state) => state.exportPdf);
  const setIsCompareModalOpen = useSimulationStore((state) => state.setIsCompareModalOpen);
  const setIsAIPersonaModalOpen = useSimulationStore((state) => state.setIsAIPersonaModalOpen);
  const applyProvince = useSimulationStore((state) => state.applyProvince);

  const province = props.province ?? storeProvince;
  const activePresetId = props.activePresetId ?? storeActivePresetId;
  const onSelectPreset = props.onSelectPreset ?? selectPreset;
  const onReset = props.onReset ?? resetToDefault;
  const onExportPdf = props.onExportPdf ?? exportPdf;
  const isExportingPdf = props.isExportingPdf ?? storeIsExportingPdf;
  const onOpenCompare = props.onOpenCompare ?? (() => setIsCompareModalOpen(true));
  const onOpenAIPersonaModal = props.onOpenAIPersonaModal ?? (() => setIsAIPersonaModalOpen(true));
  const onProvinceChange = props.onProvinceChange ?? applyProvince;
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3.5 gap-3">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-red-500 shadow-md shadow-rose-950/40">
              <span className="text-xl select-none" role="img" aria-label="Canadian Maple Leaf">🍁</span>
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-900" title="CRA 2025/2026 Indexed"></div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                  MapleRetire
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    Canada
                  </span>
                  {isCalculating && (
                    <span className="text-[10px] font-medium text-rose-300 bg-rose-950/60 border border-rose-800/50 px-2 py-0.5 rounded-full flex items-center gap-1.5 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping"></span>
                      Updating...
                    </span>
                  )}
                </h1>
              </div>
              <p className="text-xs text-slate-400">
                RRSP • TFSA • FHSA • CPP • OAS Retirement & Tax Simulator
              </p>
            </div>
          </div>

          {/* Quick Controls & Actions */}
          <div className="flex items-center flex-wrap gap-2 sm:gap-3">
            
            {/* Province Selector */}
            <div className="flex items-center bg-slate-800/80 rounded-lg border border-slate-700/80 px-2.5 py-1 text-xs">
              <MapPin className="w-3.5 h-3.5 text-rose-400 mr-1.5 shrink-0" />
              <span className="text-slate-400 mr-1.5 hidden sm:inline">Province:</span>
              <select
                value={province}
                onChange={(e) => onProvinceChange(e.target.value as CanadianProvince)}
                className="bg-transparent text-slate-100 font-medium focus:outline-none cursor-pointer text-xs"
              >
                {Object.entries(PROVINCIAL_BRACKETS).map(([code, p]) => (
                  <option key={code} value={code} className="bg-slate-900 text-white">
                    {p.name} ({code})
                  </option>
                ))}
              </select>
            </div>

            {/* Persona Selector with Hover Assumption Explanation */}
            <PersonaHoverCard
              currentPresetId={activePresetId}
              onSelectPreset={onSelectPreset}
              onOpenAIPersonaModal={onOpenAIPersonaModal}
            />

            {/* AI Persona Prompt Trigger */}
            <button
              onClick={onOpenAIPersonaModal}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 text-indigo-200 hover:text-white border border-indigo-700/60 shadow-xs transition"
              title="Prompt any Canadian retirement scenario in natural language with AI"
            >
              <Wand2 className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">AI Persona</span>
            </button>

            {/* Compare Scenarios button */}
            <button
              onClick={onOpenCompare}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              title="Compare retiring at 58 vs 62 vs 67"
            >
              <Scale className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Compare</span> Ages
            </button>

            {/* Estate Planning Quick Link */}
            <button
              onClick={() => {
                const el = document.getElementById('estate-planning-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 text-indigo-200 hover:text-white border border-indigo-700/60 transition shadow-xs"
              title="Jump to Canadian Estate Planning & Reserves Liquidation"
            >
              <Landmark className="w-3.5 h-3.5 text-indigo-400" />
              <span>Estate Plan</span>
            </button>

            {/* PDF Export button */}
            <button
              onClick={onExportPdf}
              disabled={isExportingPdf}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-sm hover:shadow transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>{isExportingPdf ? 'Exporting...' : 'Export PDF'}</span>
            </button>

            {/* Reset button */}
            <button
              onClick={onReset}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              title="Reset to default scenario"
              aria-label="Reset scenario"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
