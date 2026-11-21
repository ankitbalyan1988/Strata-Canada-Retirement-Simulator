import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface SectionCollapseButtonProps {
  isCollapsed: boolean;
  onToggle: () => void;
  sectionLabel: string;
  compact?: boolean;
}

export const SectionCollapseButton: React.FC<SectionCollapseButtonProps> = React.memo(
  ({ isCollapsed, onToggle, sectionLabel, compact = false }) => {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        aria-expanded={!isCollapsed}
        aria-label={isCollapsed ? `Expand ${sectionLabel}` : `Collapse ${sectionLabel}`}
        title={isCollapsed ? `Expand ${sectionLabel}` : `Collapse ${sectionLabel}`}
        className={`inline-flex items-center gap-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer shrink-0 select-none ${
          compact ? 'px-2 py-1 text-[11px] font-semibold' : 'px-2.5 py-1.5 text-xs font-semibold'
        }`}
      >
        <span className="hidden sm:inline">{isCollapsed ? 'Expand' : 'Collapse'}</span>
        {isCollapsed ? (
          <ChevronDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        ) : (
          <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        )}
      </button>
    );
  }
);

SectionCollapseButton.displayName = 'SectionCollapseButton';
