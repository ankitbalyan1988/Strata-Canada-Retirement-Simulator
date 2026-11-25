import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { LifeEvent } from '../../types/retirement';
import { LifeEventsManager } from '../LifeEventsManager';
import { useSimulationStore } from '../../store/useSimulationStore';
import { InputTabProps, useInputTabDispatch } from './inputTabHelpers';

const EMPTY_EVENTS: LifeEvent[] = [];

export const LifeEventsTab: React.FC<InputTabProps> = React.memo(
  ({ externalInputs, externalOnChange }) => {
    const { updateField } = useInputTabDispatch(externalOnChange);

    const storeSlice = useSimulationStore(
      useShallow((state) => ({
        lifeEvents: state.inputs.lifeEvents,
        currentAge: state.inputs.currentAge,
        retirementAge: state.inputs.retirementAge,
        lifeExpectancy: state.inputs.lifeExpectancy,
        inflationRate: state.inputs.inflationRate,
        isMarried: state.inputs.maritalStatus === 'married'
      }))
    );

    const lifeEvents = externalInputs
      ? externalInputs.lifeEvents ?? EMPTY_EVENTS
      : storeSlice.lifeEvents ?? EMPTY_EVENTS;
    const currentAge = externalInputs ? externalInputs.currentAge : storeSlice.currentAge;
    const retirementAge = externalInputs ? externalInputs.retirementAge : storeSlice.retirementAge;
    const lifeExpectancy = externalInputs
      ? externalInputs.lifeExpectancy
      : storeSlice.lifeExpectancy;
    const inflationRate = externalInputs ? externalInputs.inflationRate : storeSlice.inflationRate;
    const isMarried = externalInputs
      ? externalInputs.maritalStatus === 'married'
      : storeSlice.isMarried;

    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-50">
              Discrete Life Events &amp; Cash Flow Shocks
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Model lump-sum inflows, one-time or multi-year expenses, sabbaticals, and temporary
              layoffs at exact ages beyond your recurring monthly budget and real estate plan.
            </p>
          </div>
        </div>

        <LifeEventsManager
          events={lifeEvents}
          currentAge={currentAge}
          retirementAge={retirementAge}
          lifeExpectancy={lifeExpectancy}
          inflationRate={inflationRate}
          isMarried={isMarried}
          onChange={(updatedEvents) => updateField('lifeEvents', updatedEvents)}
        />
      </div>
    );
  }
);

LifeEventsTab.displayName = 'LifeEventsTab';
