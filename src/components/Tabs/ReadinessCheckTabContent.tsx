import React, { Suspense } from 'react';
import { RetirementProgress } from '../RetirementProgress';
import { ModuleLoadingFallback } from '../ModuleLoadingFallback';

const RetirementAgeOptimizer = React.lazy(() =>
  import('../RetirementAgeOptimizer').then((m) => ({ default: m.RetirementAgeOptimizer }))
);

export const ReadinessCheckTabContent: React.FC = () => {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* 1. Retirement Progress & Readiness Today */}
      <RetirementProgress />

      {/* 2. Suggested Retirement Age (Monte Carlo Retirement Age Optimizer — Lazy Loaded) */}
      <Suspense
        fallback={
          <ModuleLoadingFallback
            moduleName="Retirement Age Optimizer"
            subtitle="Loading Monte Carlo stochastic simulation engine and interactive probability charts..."
            themeColor="emerald"
          />
        }
      >
        <RetirementAgeOptimizer />
      </Suspense>
    </div>
  );
};
