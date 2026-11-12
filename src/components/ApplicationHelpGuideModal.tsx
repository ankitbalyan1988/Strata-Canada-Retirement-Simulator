import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  BookOpen,
  Code,
  Layers,
  Compass,
  Search,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Landmark,
  ShieldCheck,
  Receipt,
  Calculator,
  Cpu,
  Database,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  ArrowRight,
  Flame,
  Home,
  Coins,
  Globe,
  Sliders,
  Sparkles,
  HelpCircle,
  ExternalLink,
  Zap
} from 'lucide-react';
import { useSimulationStore } from '../store/useSimulationStore';

export interface ApplicationHelpGuideModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

type GuideTab = 'functional' | 'technical';

interface GuideSection {
  id: string;
  category: string;
  title: string;
  badge?: string;
  icon: React.ComponentType<{ className?: string }>;
  summary: string;
  content: React.ReactNode;
}

export const ApplicationHelpGuideModal: React.FC<ApplicationHelpGuideModalProps> = (props) => {
  const storeIsOpen = useSimulationStore((state) => state.isHelpGuideModalOpen);
  const storeSetIsOpen = useSimulationStore((state) => state.setIsHelpGuideModalOpen);

  const isOpen = props.isOpen ?? storeIsOpen;
  const onClose = props.onClose ?? (() => storeSetIsOpen(false));

  const [activeTab, setActiveTab] = useState<GuideTab>('functional');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Toggle individual section accordion
  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [id]: prev[id] === undefined ? false : !prev[id]
    }));
  };

  // Toggle all expand/collapse
  const toggleAll = (expand: boolean) => {
    const currentSections = activeTab === 'functional' ? functionalSections : technicalSections;
    const newExpanded: Record<string, boolean> = {};
    currentSections.forEach((s) => {
      newExpanded[s.id] = expand;
    });
    setExpandedSections(newExpanded);
  };

  // -------------------------------------------------------------
  // PART 1: FUNCTIONAL USER GUIDE SECTIONS
  // -------------------------------------------------------------
  const functionalSections: GuideSection[] = useMemo(() => [
    {
      id: 'f_intro',
      category: 'Overview',
      title: 'Welcome to Strata & Planning Philosophy',
      badge: 'Core Concept',
      icon: Compass,
      summary: 'Canadian-specific wealth modeling designed for holistic lifetime accumulation, decumulation, and estate transition.',
      content: (
        <div className="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          <p>
            <strong>Strata</strong> is an audit-grade Canadian wealth and retirement simulation platform. Unlike generic retirement calculators that apply simplistic flat withdrawal rates and single blended tax percentages, Strata computes an exact, year-by-year financial ledger model indexed to CRA statutory rules from your current age through life expectancy.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
              <span className="font-bold text-slate-900 dark:text-slate-100 block mb-1">1. Full Lifecycle Scope</span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Models working wealth accumulation, career disruptions, debt pay-offs, home purchases, retirement decumulation, and terminal estate deemed disposition.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
              <span className="font-bold text-slate-900 dark:text-slate-100 block mb-1">2. Canadian Tax Engine</span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Exact federal and provincial progressive tax brackets (all 13 provinces/territories), Basic Personal Amounts (BPA), age credits, and OAS clawback recovery taxes.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
              <span className="font-bold text-slate-900 dark:text-slate-100 block mb-1">3. Institutional Realism</span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Historical stress test market crashes (2008 GFC, 2000 Dot-com, 1970s stagflation), cross-border expat departure taxes (CRA §128.1), and multi-tab Excel export.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'f_workflow',
      category: 'Workflow',
      title: 'How to Navigate the 4 Primary Application Views',
      badge: 'Step-by-Step',
      icon: Layers,
      summary: 'Understand the navigation hierarchy across Dashboard, Inputs, Estate Planning, and Expat Emigration.',
      content: (
        <div className="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          <p>
            Use the top header navigation or left sidebar to switch between the four primary planning environments:
          </p>
          <ul className="space-y-2.5">
            <li className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-2.5">
              <span className="p-1 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-400 font-bold shrink-0 text-[10px]">VIEW 1</span>
              <div>
                <strong className="text-slate-900 dark:text-slate-100">Dashboard & Analytics:</strong> Your executive mission control. Houses the Retirement Milestone Timeline, high-level KPI scorecard, circular progress gauge, hero retirement age simulator, savings pulse pacing, and 5 sub-tabs (Main Dashboard, Simulation Ledger, Cash Flows, Plan Stress Test, What-If Lab).
              </div>
            </li>
            <li className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-2.5">
              <span className="p-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-400 font-bold shrink-0 text-[10px]">VIEW 2</span>
              <div>
                <strong className="text-slate-900 dark:text-slate-100">Profile & Plan Inputs:</strong> Configure personal details, household marital status, spouse finances, current salaries, monthly savings targets, employer RRSP match configs, consumer/mortgage debts, and government benefit start ages (CPP/OAS).
              </div>
            </li>
            <li className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-2.5">
              <span className="p-1 rounded-lg bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-400 font-bold shrink-0 text-[10px]">VIEW 3</span>
              <div>
                <strong className="text-slate-900 dark:text-slate-100">Canadian Estate Planning & Deemed Disposition:</strong> Models testamentary succession at death under CRA Section 70(5). Computes terminal income tax liabilities, probate fees (Estate Administration Tax), spousal rollover deferrals, and net inheritance to heirs.
              </div>
            </li>
            <li className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-2.5">
              <span className="p-1 rounded-lg bg-cyan-100 dark:bg-cyan-900/60 text-cyan-700 dark:text-cyan-400 font-bold shrink-0 text-[10px]">VIEW 4</span>
              <div>
                <strong className="text-slate-900 dark:text-slate-100">Expat & Cross-Border Emigration:</strong> Simulates severing Canadian tax residency. Models CRA Section 128.1 departure tax on non-registered capital property, non-resident Part XIII withholding taxes (15%–25%), bilateral tax treaties, and purchasing power parity across 10 global destinations.
              </div>
            </li>
          </ul>
        </div>
      )
    },
    {
      id: 'f_dashboard_tabs',
      category: 'Dashboard',
      title: 'Navigating the 5 Dedicated Dashboard Tabs',
      badge: 'Analytics',
      icon: TrendingUp,
      summary: 'Explore the Main Dashboard, Annual Simulation Ledger, Cash Flow Projections, Stress Testing, and What-If Lab.',
      content: (
        <div className="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          <div className="space-y-2">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
              <strong className="text-slate-900 dark:text-slate-100 block mb-1">1. Main Dashboard:</strong>
              <p className="text-slate-500 dark:text-slate-400">
                Houses the new <strong>Interactive Retirement Roadmap & Milestones</strong> timeline, financial KPI cards (Net Worth Today, Annual Target, Nest Egg at Retirement, Readiness Score), circular readiness gauge, interactive retirement age slider, monthly savings pulse, and 3 dedicated visual trajectory portlets (Net Worth Trajectory, Post-Retirement Cash Flows, and Marginal Tax Brackets).
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
              <strong className="text-slate-900 dark:text-slate-100 block mb-1">2. Annual Simulation Ledger & Milestone Schedule:</strong>
              <p className="text-slate-500 dark:text-slate-400">
                The master accounting schedule of the plan. Displays age-by-age earned income, account balances (RRSP, TFSA, FHSA, Non-Reg), government pensions, decumulation drawdowns, tax liabilities, and strategic milestone badges. Placed directly below the table is the <strong>RRSP/RRIF Break-Even Withdrawal Module</strong> comparing gradual drawdown vs age 72 lump-sum RRIF conversion.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
              <strong className="text-slate-900 dark:text-slate-100 block mb-1">3. Current and Projected Cash Flows:</strong>
              <p className="text-slate-500 dark:text-slate-400">
                A dedicated visualizer and ledger table tracking cash inflows (Salary, CPP/OAS, Withdrawals), cash outflows (Living Target, Debt Service), CRA tax liabilities, registered savings, and net spendable cash surplus with live accounting Excel export.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
              <strong className="text-slate-900 dark:text-slate-100 block mb-1">4. Plan Stress Test & Economic Resilience:</strong>
              <p className="text-slate-500 dark:text-slate-400">
                Stress-test the resilience of your portfolio against severe historical economic shocks: 2008 Global Financial Crisis (-38%), 2000 Dot-com crash (-45%), 1970s high-inflation stagflation, and interest rate spikes. You can configure when the shock hits (immediate, at retirement, or at a custom age).
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
              <strong className="text-slate-900 dark:text-slate-100 block mb-1">5. What-If Sensitivity Lab:</strong>
              <p className="text-slate-500 dark:text-slate-400">
                Real-time multi-variable sensitivity modeling. Adjust market returns (-3% to +3%), inflation drag, discretionary retirement spending variations, retirement age shifts, and one-time future windfalls or inheritances with instant visual delta overlays.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'f_registered_accounts',
      category: 'Canadian Tax Rules',
      title: 'Canadian Registered Accounts & Decumulation Rules',
      badge: 'Tax Shelters',
      icon: Landmark,
      summary: 'Rules and tax implications for TFSA, RRSP, FHSA, Non-Reg, CPP, OAS, and RRIF conversion.',
      content: (
        <div className="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
              <span className="font-bold text-emerald-700 dark:text-emerald-400 block mb-1">TFSA (Tax-Free Savings Account)</span>
              <p className="text-[11.5px] text-slate-500 dark:text-slate-400">
                Contributed with after-tax dollars. 100% of capital gains, dividends, interest, and future withdrawals are completely exempt from Canadian income tax and do NOT trigger OAS clawback.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
              <span className="font-bold text-indigo-700 dark:text-indigo-400 block mb-1">RRSP (Registered Retirement Savings Plan)</span>
              <p className="text-[11.5px] text-slate-500 dark:text-slate-400">
                Generates an upfront tax deduction against your top marginal tax bracket. Compounding is tax-deferred. Must convert to a RRIF by December 31 of age 71. Withdrawals are taxed as regular income.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
              <span className="font-bold text-amber-700 dark:text-amber-400 block mb-1">FHSA (First Home Savings Account)</span>
              <p className="text-[11.5px] text-slate-500 dark:text-slate-400">
                Combines RRSP tax deductions on contributions ($8,000/yr up to $40,000 lifetime) with TFSA tax-free withdrawals for a qualifying first home. Can be stacked with the $60,000 RRSP HBP.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
              <span className="font-bold text-purple-700 dark:text-purple-400 block mb-1">Age 71 RRIF Mandatory Conversion</span>
              <p className="text-[11.5px] text-slate-500 dark:text-slate-400">
                Under CRA §146, RRSPs must be converted to RRIFs by age 71. Mandatory minimum withdrawals start at age 72 (5.40% at age 72, scaling upward annually).
              </p>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60">
            <span className="font-bold text-blue-800 dark:text-blue-300 block mb-1">Government Benefits: CPP & OAS Optimization</span>
            <p className="text-[11.5px] text-blue-700 dark:text-blue-300">
              <strong>CPP (Age 60-70):</strong> Claiming before 65 reduces benefits by 0.6%/mo (-36% max at 60); delaying past 65 increases benefits by 0.7%/mo (+42% max at 70).<br />
              <strong>OAS (Age 65-70):</strong> Universal monthly benefit subject to statutory clawback recovery tax (15% on net income above ~$93,208 for 2025/2026).
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'f_tools_export',
      category: 'Tools & Scenarios',
      title: 'Tools Section: Scenarios, History, and Exporting',
      badge: 'Productivity',
      icon: Sliders,
      summary: 'How to snapshot scenarios, compare retirement ages, restore versions, and export to Excel and PDF.',
      content: (
        <div className="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          <ul className="space-y-2">
            <li>
              <strong>Top Scenario Switcher & Sidebar Snapshots:</strong> Whenever you save more than one scenario snapshot, a top dropdown appears in the header and in the sidebar to toggle between plan variants with 1 click.
            </li>
            <li>
              <strong>Compare Ages Tool:</strong> Test multiple retirement ages (e.g. 58 vs 62 vs 65 vs 67) side-by-side to compare required nest egg, portfolio survival years, and lifetime CRA taxes.
            </li>
            <li>
              <strong>Master Comprehensive Excel Export:</strong> The green Excel button in the header exports a complete multi-tab workbook containing the Annual Simulation Ledger, Estate Planning Ledger, Stress Test Ledgers, Expat Ledger, and Cash Flow Projections—all with native Excel formulas and accounting formatting.
            </li>
            <li>
              <strong>Executive PDF Report:</strong> The PDF export button in the sidebar compiles a branded client presentation deck complete with scorecards, key milestones, and year-by-year cashflow projections.
            </li>
          </ul>
        </div>
      )
    }
  ], []);

  // -------------------------------------------------------------
  // PART 2: TECHNICAL ARCHITECTURE GUIDE SECTIONS
  // -------------------------------------------------------------
  const technicalSections: GuideSection[] = useMemo(() => [
    {
      id: 't_stack',
      category: 'System Stack',
      title: 'Technical Stack & Client-Authoritative Architecture',
      badge: 'Architecture',
      icon: Cpu,
      summary: 'React 19 SPA, Vite 8, TypeScript 5.8, Tailwind CSS v4, and Zustand state management.',
      content: (
        <div className="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          <p>
            The application is built as an ultra-responsive, zero-latency client-side financial computation engine running in a modern React Single-Page Application (SPA):
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 font-mono text-[11px]">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
              <div className="font-bold text-slate-900 dark:text-slate-100 font-sans mb-1">Frontend Core</div>
              <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                <li>• React: 19.0.1 (Strict Functional Hooks)</li>
                <li>• Bundler: Vite 8.3.0</li>
                <li>• Language: TypeScript 5.8 (Strict Typing)</li>
                <li>• Styling: Tailwind CSS v4 (@import "tailwindcss")</li>
                <li>• Icons: Lucide React (Tree-shaken)</li>
              </ul>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
              <div className="font-bold text-slate-900 dark:text-slate-100 font-sans mb-1">State & Engine</div>
              <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                <li>• State Store: Zustand 5.0.16 with useShallow</li>
                <li>• Spreadsheet Engine: ExcelJS 4.4.0</li>
                <li>• Document Generation: jsPDF + autoTable</li>
                <li>• Virtualization: @tanstack/react-virtual</li>
                <li>• Backend / API: Node.js Express + @google/genai</li>
              </ul>
            </div>
          </div>
          <p className="text-[11.5px] text-slate-500 dark:text-slate-400">
            <strong>Client-Authoritative Execution:</strong> All simulation iterations, compound growth math, and tax bracket calculations occur synchronously on the client thread in sub-10 milliseconds. This enables real-time reactive sliders with zero network hops or latency.
          </p>
        </div>
      )
    },
    {
      id: 't_engine_pipeline',
      category: 'Simulation Pipeline',
      title: 'Simulation Math & Annual Loop Execution Pipeline',
      badge: 'Core Engine',
      icon: Calculator,
      summary: 'Inside src/utils/simulator.ts: step-by-step annual execution cycle and decumulation ordering.',
      content: (
        <div className="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          <p>
            The simulation is executed via <code>runSimulation(inputs: RetirementInputs)</code> in <code>src/utils/simulator.ts</code>. It loops sequentially through every calendar year from <code>currentAge</code> to <code>lifeExpectancy</code>:
          </p>
          <div className="p-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto space-y-1.5 border border-slate-800">
            <div className="text-emerald-400 font-bold">// Annual Execution Loop (Age = currentAge to lifeExpectancy)</div>
            <div>1. Phase Check: isRetired = (age &gt;= retirementAge);</div>
            <div>2. Income Compounding: salary = base * (1 + salaryGrowthRate)^(age - currentAge);</div>
            <div>3. Debt Service: amortizeLoan(balance, rate, term); apply extra prepayment;</div>
            <div>4. Working Contributions: allocate Waterfall (RRSP + Employer Match -&gt; TFSA -&gt; FHSA -&gt; NonReg);</div>
            <div>5. Asset Growth: balance[i] = balance[i] * (1 + accountReturnRate[i]);</div>
            <div>6. Pension Entitlements: cpp = calcCpp(cppAge, method); oas = calcOas(oasAge, yearsResident);</div>
            <div>7. Decumulation Waterfall: withdraw from Non-Reg -&gt; TFSA -&gt; RRSP (or Meltdown order);</div>
            <div>8. RRIF Prescribed Draw: if (age &gt;= 72) enforce CRA statutory min withdrawal factor;</div>
            <div>9. CRA Tax Calculation: run progressive brackets for Federal + Provincial tax codes;</div>
            <div>10. Net Spendable Surplus: surplus = TotalInflow - LivingOutflow - Debt - CRATaxPaid;</div>
          </div>
          <p className="text-[11.5px]">
            <strong>Decumulation Strategy Modes:</strong> The engine implements 3 distinct decumulation drawdown algorithms:
          </p>
          <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
            <li><code>pro_rata</code>: Proportionate withdrawals across all funded accounts based on current asset allocation.</li>
            <li><code>non_reg_first</code>: Exhausts taxable non-registered capital first, shielding TFSA and RRSP for maximum tax-sheltered compounding.</li>
            <li><code>rrsp_meltdown</code>: Strategically draws down RRSP balances early to maximize low marginal tax brackets and prevent future RRIF age 72 OAS clawback spikes.</li>
          </ul>
        </div>
      )
    },
    {
      id: 't_tax_engine',
      category: 'Tax Engine',
      title: 'Canadian Tax Engine & Statutory Formulas',
      badge: 'ITA Rules',
      icon: Receipt,
      summary: 'Progressive provincial brackets, Basic Personal Amount formulas, OAS clawback, and CPP multipliers.',
      content: (
        <div className="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          <p>
            Implemented in <code>src/utils/canadianTax.ts</code> and <code>src/utils/simulator.ts</code>, the tax engine implements actual Canadian Income Tax Act (ITA) specifications:
          </p>
          <div className="space-y-2.5">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
              <span className="font-bold text-slate-900 dark:text-slate-100 block mb-1">1. Federal & Provincial Progressive Brackets</span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                Tax = ∑ (Bracket_Income_i × Rate_i) - (BPA × 15%) - PensionCredit - AgeAmountCredit
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Supports all 10 provinces and 3 territories, including Quebec's separate federal abatement (-16.5%) and Ontario Health Premium scales.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
              <span className="font-bold text-slate-900 dark:text-slate-100 block mb-1">2. OAS Clawback Recovery Surtax Formula</span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                OAS_Clawback = max(0, min(Gross_OAS, 0.15 × (Net_World_Income - Clawback_Threshold)))
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Modeled at the 2025/2026 threshold (~$93,208 indexed to CPI). Fully eliminates OAS when net taxable income exceeds ~$148,000.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
              <span className="font-bold text-slate-900 dark:text-slate-100 block mb-1">3. CPP Early / Delayed Actuarial Adjustments</span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                Factor = age &lt; 65 ? (1 - (65 - age) × 0.072) : (1 + (age - 65) × 0.084)
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Produces permanent statutory adjustments: 64% of base at age 60, up to 142% of base at age 70.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 't_state_management',
      category: 'State & Reactivity',
      title: 'Zustand State Store & Atomic Re-rendering Discipline',
      badge: 'State Machine',
      icon: Database,
      summary: 'Inside src/store/useSimulationStore.ts: single source of truth, shallow selectors, and snapshot rollbacks.',
      content: (
        <div className="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          <p>
            State is centralized in <code>useSimulationStore</code> with strict immutable state transitions:
          </p>
          <ul className="space-y-2 text-[11.5px]">
            <li>
              <strong>Decoupled Snapshotting:</strong> Every time inputs change, the simulation recomputes <code>yearlyResults</code> and <code>summary</code>. Users can call <code>saveSnapshot(label)</code> to create an immutable deep-clone in <code>state.history</code>.
            </li>
            <li>
              <strong>Shallow Subscription Slices:</strong> To prevent re-render cascades in complex charts and tables, components subscribe via Zustand's <code>useShallow</code> (e.g. <code>useSimulationStore(useShallow((s) =&gt; s.yearlyResults))</code>).
            </li>
            <li>
              <strong>Zero Hook Order Violations:</strong> Components maintain unconditional hook calls at the top level to strictly adhere to React 19 rules of hooks.
            </li>
          </ul>
        </div>
      )
    },
    {
      id: 't_excel_engine',
      category: 'Export Engine',
      title: 'Audit-Grade Excel Workbook Generation Engine',
      badge: 'ExcelJS',
      icon: FileSpreadsheet,
      summary: 'Inside src/utils/excelExport.ts: native Excel formula construction and multi-tab master workbooks.',
      content: (
        <div className="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          <p>
            Unlike typical tools that export flat CSVs with baked numbers, Strata’s Excel engine (<code>src/utils/excelExport.ts</code>) generates native <code>.xlsx</code> workbooks with dynamic spreadsheet formulas:
          </p>
          <div className="p-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] border border-slate-800 space-y-1">
            <div className="text-indigo-400 font-bold">// Preserved Live Excel Formulas</div>
            <div>cellTotalInflow.value = &#123; formula: `SUM(D$&#123;row&#125;:F$&#123;row&#125;)`, result: totalInflow &#125;;</div>
            <div>cellTotalOutflow.value = &#123; formula: `SUM(H$&#123;row&#125;:I$&#123;row&#125;)`, result: totalOutflow &#125;;</div>
            <div>cellNetSurplus.value = &#123; formula: `G$&#123;row&#125;-J$&#123;row&#125;-K$&#123;row&#125;`, result: netSurplus &#125;;</div>
            <div>cellPhase.value = &#123; formula: `IF(A$&#123;row&#125;&gt;=$&#123;retireAge&#125;, "Retirement", "Working")`, result: phase &#125;;</div>
          </div>
          <p className="text-[11.5px] text-slate-500 dark:text-slate-400">
            Worksheets feature frozen header rows (split at row 5), zebra stripe backgrounds, currency formatting masks (<code>$#,##0;($#,##0);"-"</code>), and classic double-underline accounting total borders.
          </p>
        </div>
      )
    }
  ], []);

  // Filtered sections according to search query and category
  const filteredSections = useMemo(() => {
    const list = activeTab === 'functional' ? functionalSections : technicalSections;
    return list.filter((s) => {
      if (selectedCategory !== 'all' && s.category.toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = s.title.toLowerCase().includes(q);
        const matchCategory = s.category.toLowerCase().includes(q);
        const matchSummary = s.summary.toLowerCase().includes(q);
        return matchTitle || matchCategory || matchSummary;
      }
      return true;
    });
  }, [activeTab, functionalSections, technicalSections, selectedCategory, searchQuery]);

  // Categories for the active tab
  const categories = useMemo(() => {
    const list = activeTab === 'functional' ? functionalSections : technicalSections;
    const cats = Array.from(new Set(list.map((s) => s.category)));
    return ['all', ...cats];
  }, [activeTab, functionalSections, technicalSections]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden transition-colors"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-guide-title"
      >
        {/* Modal Top Header Bar */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4 bg-slate-50/60 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 rounded-xl border border-indigo-100/60 dark:border-indigo-800/60 shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="help-guide-title" className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  Application Help & Architecture Guide
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/50">
                  Strata Manual
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Comprehensive reference manual covering functional workflows, Canadian retirement rules, and technical engine architecture.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            aria-label="Close Help Guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: Functional vs Technical Guide */}
        <div className="px-5 sm:px-6 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900">
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700 text-xs w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setActiveTab('functional');
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'functional'
                  ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Part 1: Functional User Guide</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('technical');
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'technical'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Code className="w-4 h-4" />
              <span>Part 2: Technical Architecture Guide</span>
            </button>
          </div>

          {/* Quick Expand / Collapse All Controls */}
          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={() => toggleAll(true)}
              className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Expand All
            </button>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <button
              type="button"
              onClick={() => toggleAll(false)}
              className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Collapse All
            </button>
          </div>
        </div>

        {/* Filter and Search Sub-bar */}
        <div className="px-5 sm:px-6 py-2.5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-slate-50/40 dark:bg-slate-900/40">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat === 'all' ? 'All Topics' : cat}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search help guide..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Accordion Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-3">
          {filteredSections.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <HelpCircle className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No help topics match your search query.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
              >
                Reset search filters
              </button>
            </div>
          ) : (
            filteredSections.map((section, idx) => {
              const isExpanded = expandedSections[section.id] ?? (idx === 0);
              const Icon = section.icon;

              return (
                <div
                  key={section.id}
                  className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 overflow-hidden shadow-2xs transition-all"
                >
                  <button
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    className="w-full p-4 text-left flex items-start sm:items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0 mt-0.5 sm:mt-0">
                        <Icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            {section.category}
                          </span>
                          {section.badge && (
                            <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/40">
                              {section.badge}
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight mt-0.5">
                          {section.title}
                        </h4>
                        {!isExpanded && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                            {section.summary}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="p-4 pt-1 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/30 animate-in fade-in duration-150">
                      {section.content}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Bottom Action Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/60 dark:bg-slate-900/60 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2 text-center sm:text-left">
            <Zap className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Need personalized scenario modeling? Use <strong>What-If Analysis</strong> or snapshot a variant in <strong>Plan History</strong>.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
