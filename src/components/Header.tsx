import React from 'react';
import { 
  FileDown, 
  RotateCcw, 
  Scale, 
  MapPin,
  Wand2,
  Landmark,
  Sun,
  Moon
} from 'lucide-react';
import { CanadianProvince, ScenarioPreset } from '../types/retirement';
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
  const theme = useSimulationStore((state) => state.theme);
  const setTheme = useSimulationStore((state) => state.setTheme);
  const toggleTheme = useSimulationStore((state) => state.toggleTheme);
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
    <header className="bg-white/95 dark:bg-[#11141A]/95 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3 gap-3">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            {/* Strata Architectural Monogram */}
            <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-500 text-white shadow-xs shadow-emerald-500/20 shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* 3 clean geometric strata layers representing wealth tiers */}
                <path d="M4 7C4 5.89543 4.89543 5 6 5H18C19.1046 5 20 5.89543 20 7V7C20 8.10457 19.1046 9 18 9H6C4.89543 9 4 8.10457 4 7V7Z" fill="white" fillOpacity="0.95" />
                <path d="M7 12C7 10.8954 7.89543 10 9 10H20C20 11.1046 19.1046 12 18 12H9C7.89543 12 7 11.1046 7 12V12Z" fill="white" fillOpacity="0.75" />
                <path d="M4 17C4 15.8954 4.89543 15 6 15H17C18.1046 15 19 15.8954 19 17V17C19 18.1046 18.1046 19 17 19H6C4.89543 19 4 18.1046 4 17V17Z" fill="white" fillOpacity="0.95" />
              </svg>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white dark:border-[#11141A]" title="CRA 2025/2026 Engine Online" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-1.5 font-['Plus_Jakarta_Sans']">
                  Strata
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60">
                    Canada
                  </span>
                  {isCalculating && (
                    <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/50 px-2 py-0.5 rounded-full flex items-center gap-1.5 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                      Updating...
                    </span>
                  )}
                </h1>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Institutional Wealth & Retirement Intelligence
              </p>
            </div>
          </div>

          {/* Quick Controls & Actions */}
          <div className="flex items-center flex-wrap gap-2 sm:gap-2.5">
            
            {/* Province Selector */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/70 rounded-xl border border-zinc-200/80 dark:border-zinc-700/70 px-2.5 py-1.5 text-xs">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 mr-1.5 shrink-0" />
              <span className="text-zinc-500 dark:text-zinc-400 mr-1.5 hidden sm:inline">Province:</span>
              <select
                value={province}
                onChange={(e) => onProvinceChange(e.target.value as CanadianProvince)}
                className="bg-transparent text-zinc-800 dark:text-zinc-200 font-medium focus:outline-none cursor-pointer text-xs"
              >
                {Object.entries(PROVINCIAL_BRACKETS).map(([code, p]) => (
                  <option key={code} value={code} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
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
              type="button"
              onClick={onOpenAIPersonaModal}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200/70 dark:bg-zinc-800/70 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700/70 transition shadow-xs"
              title="Prompt any Canadian retirement scenario in natural language with AI"
            >
              <Wand2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">AI Persona</span>
            </button>

            {/* Compare Scenarios button */}
            <button
              type="button"
              onClick={onOpenCompare}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200/70 dark:bg-zinc-800/70 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700/70 transition shadow-xs"
              title="Compare retiring at 58 vs 62 vs 67"
            >
              <Scale className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
              <span className="hidden sm:inline">Compare</span> Ages
            </button>

            {/* Estate Planning Quick Link */}
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('estate-planning-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200/70 dark:bg-zinc-800/70 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700/70 transition shadow-xs"
              title="Jump to Canadian Estate Planning & Reserves Liquidation"
            >
              <Landmark className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
              <span>Estate Plan</span>
            </button>

            {/* PDF Export button */}
            <button
              type="button"
              onClick={onExportPdf}
              disabled={isExportingPdf}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs hover:shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>{isExportingPdf ? 'Exporting...' : 'Export PDF'}</span>
            </button>

            {/* Theme Toggle (Light / Dark Segmented Switch) */}
            <div 
              className="flex items-center p-0.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/90 dark:border-zinc-700/80 text-xs shadow-2xs"
              role="radiogroup"
              aria-label="Theme mode toggle"
            >
              <button
                type="button"
                role="radio"
                aria-checked={theme === 'light'}
                onClick={() => setTheme('light')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition cursor-pointer ${
                  theme === 'light'
                    ? 'bg-white text-zinc-900 shadow-xs border border-zinc-200/70 font-bold'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 font-medium'
                }`}
                title="Switch to light theme"
              >
                <Sun className={`w-3.5 h-3.5 ${theme === 'light' ? 'text-amber-500 fill-amber-500/20' : 'text-zinc-400'}`} />
                <span className="hidden sm:inline">Light</span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={theme === 'dark'}
                onClick={() => setTheme('dark')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-zinc-900 text-white shadow-xs border border-zinc-750 font-bold'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 font-medium'
                }`}
                title="Switch to dark theme"
              >
                <Moon className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-indigo-400 fill-indigo-400/20' : 'text-zinc-400'}`} />
                <span className="hidden sm:inline">Dark</span>
              </button>
            </div>

            {/* Reset button */}
            <button
              type="button"
              onClick={onReset}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 rounded-xl transition"
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
