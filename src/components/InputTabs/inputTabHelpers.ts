import React, { useCallback, startTransition } from 'react';
import {
  RetirementInputs,
  DebtItem,
  RealEstateInputs,
  AccountReturnRates,
  SpouseInputs,
  EmployerMatchConfig
} from '../../types/retirement';
import { ExpatInputs } from '../../types/expat';
import {
  DEFAULT_REAL_ESTATE_INPUTS,
  DEFAULT_ACCOUNT_RETURNS
} from '../../utils/presets';
import { DEFAULT_EXPAT_INPUTS } from '../../utils/expatCountries';
import { useSimulationStore } from '../../store/useSimulationStore';

export const EMPTY_DEBTS: DebtItem[] = [];

export interface InputTabProps {
  externalInputs?: RetirementInputs;
  externalOnChange?: React.Dispatch<React.SetStateAction<RetirementInputs>> | ((inputs: RetirementInputs) => void);
}

export const formatCur = (val: number) => `$${Math.round(val).toLocaleString()}`;

export const getCppAdjustmentText = (age: number) => {
  if (age === 65) return 'Standard baseline (100%)';
  if (age < 65) {
    const reduction = ((65 - age) * 7.2).toFixed(1);
    return `-${reduction}% permanent reduction`;
  }
  const bonus = ((age - 65) * 8.4).toFixed(1);
  return `+${bonus}% permanent enhancement`;
};

export const getOasAdjustmentText = (age: number) => {
  if (age === 65) return 'Standard baseline';
  const bonus = ((age - 65) * 7.2).toFixed(1);
  return `+${bonus}% permanent deferral boost`;
};

export function useInputTabDispatch(
  externalOnChange?: React.Dispatch<React.SetStateAction<RetirementInputs>> | ((inputs: RetirementInputs) => void)
) {
  const storeSetInputs = useSimulationStore((state) => state.setInputs);
  const onChange = externalOnChange ?? storeSetInputs;

  const dispatchInputsChange = useCallback(
    (updater: (prev: RetirementInputs) => RetirementInputs) => {
      startTransition(() => {
        (onChange as React.Dispatch<React.SetStateAction<RetirementInputs>>)(updater);
      });
    },
    [onChange]
  );

  const updateField = useCallback(
    <K extends keyof RetirementInputs>(field: K, value: RetirementInputs[K]) => {
      dispatchInputsChange((prev: RetirementInputs) => {
        const base = typeof prev === 'object' && prev !== null ? prev : useSimulationStore.getState().inputs;
        return {
          ...base,
          [field]: value
        };
      });
    },
    [dispatchInputsChange]
  );

  const updateRealEstate = useCallback(
    (patch: Partial<RealEstateInputs>) => {
      dispatchInputsChange((prev: RetirementInputs) => {
        const base = typeof prev === 'object' && prev !== null ? prev : useSimulationStore.getState().inputs;
        const current = base.realEstate || DEFAULT_REAL_ESTATE_INPUTS;
        return {
          ...base,
          realEstate: {
            ...current,
            ...patch
          }
        };
      });
    },
    [dispatchInputsChange]
  );

  const updateRealEstateField = useCallback(
    <K extends keyof RealEstateInputs>(field: K, value: RealEstateInputs[K]) => {
      updateRealEstate({ [field]: value } as Partial<RealEstateInputs>);
    },
    [updateRealEstate]
  );

  const updateAccountReturn = useCallback(
    <K extends keyof AccountReturnRates>(field: K, value: AccountReturnRates[K]) => {
      dispatchInputsChange((prev: RetirementInputs) => {
        const base = typeof prev === 'object' && prev !== null ? prev : useSimulationStore.getState().inputs;
        const current = base.accountReturns || DEFAULT_ACCOUNT_RETURNS;
        return {
          ...base,
          accountReturns: {
            ...current,
            [field]: value
          }
        };
      });
    },
    [dispatchInputsChange]
  );

  const updateSpouseField = useCallback(
    <K extends keyof SpouseInputs>(field: K, value: SpouseInputs[K]) => {
      dispatchInputsChange((prev: RetirementInputs) => {
        const base = typeof prev === 'object' && prev !== null ? prev : useSimulationStore.getState().inputs;
        if (!base.spouse) return base;
        return {
          ...base,
          spouse: {
            ...base.spouse,
            [field]: value
          }
        };
      });
    },
    [dispatchInputsChange]
  );

  const updateEmployerMatch = useCallback(
    (patch: Partial<EmployerMatchConfig>) => {
      dispatchInputsChange((prev: RetirementInputs) => {
        const base = typeof prev === 'object' && prev !== null ? prev : useSimulationStore.getState().inputs;
        const current: EmployerMatchConfig = base.employerMatch || {
          enabled: false,
          matchType: 'percent_of_salary',
          matchPercentOfSalary: 4,
          matchRatePercent: 100,
          fixedAnnualAmount: 3000
        };
        return {
          ...base,
          employerMatch: {
            ...current,
            ...patch
          }
        };
      });
    },
    [dispatchInputsChange]
  );

  const updateSpouseEmployerMatch = useCallback(
    (patch: Partial<EmployerMatchConfig>) => {
      dispatchInputsChange((prev: RetirementInputs) => {
        const base = typeof prev === 'object' && prev !== null ? prev : useSimulationStore.getState().inputs;
        if (!base.spouse) return base;
        const current: EmployerMatchConfig = base.spouse.employerMatch || {
          enabled: false,
          matchType: 'percent_of_salary',
          matchPercentOfSalary: 4,
          matchRatePercent: 100,
          fixedAnnualAmount: 3000
        };
        return {
          ...base,
          spouse: {
            ...base.spouse,
            employerMatch: {
              ...current,
              ...patch
            }
          }
        };
      });
    },
    [dispatchInputsChange]
  );

  const updateExpatField = useCallback(
    <K extends keyof ExpatInputs>(field: K, value: ExpatInputs[K]) => {
      dispatchInputsChange((prev: RetirementInputs) => {
        const base = typeof prev === 'object' && prev !== null ? prev : useSimulationStore.getState().inputs;
        const current = base.expat || {
          ...DEFAULT_EXPAT_INPUTS,
          emigrationAge: Math.max(base.currentAge + 1, base.retirementAge - 2),
          yearsLivedInCanadaAfter18: Math.min(40, Math.max(20, base.retirementAge - 18))
        };
        return {
          ...base,
          expat: {
            ...current,
            [field]: value
          }
        };
      });
    },
    [dispatchInputsChange]
  );

  return {
    dispatchInputsChange,
    updateField,
    updateRealEstate,
    updateRealEstateField,
    updateAccountReturn,
    updateSpouseField,
    updateEmployerMatch,
    updateSpouseEmployerMatch,
    updateExpatField
  };
}
