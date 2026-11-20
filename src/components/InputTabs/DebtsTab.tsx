import React, { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { DebtItem, DebtRepaymentStrategy } from '../../types/retirement';
import { getDebtQualifierFlags } from '../../utils/debtCalculator';
import { DebtsManager } from '../DebtsManager';
import { useSimulationStore } from '../../store/useSimulationStore';
import { EMPTY_DEBTS, InputTabProps, useInputTabDispatch } from './inputTabHelpers';

export const DebtsTab: React.FC<InputTabProps> = React.memo(({ externalInputs, externalOnChange }) => {
  const { updateField } = useInputTabDispatch(externalOnChange);

  const storeSlice = useSimulationStore(
    useShallow((state) => ({
      currentAge: state.inputs.currentAge,
      retirementAge: state.inputs.retirementAge,
      isFutureOnlyDebtMode: getDebtQualifierFlags(state.inputs).isFutureOnlyDebtMode
    }))
  );

  const propDebtFlags = useMemo(
    () => (externalInputs ? getDebtQualifierFlags(externalInputs) : null),
    [externalInputs]
  );

  const currentAge = externalInputs ? externalInputs.currentAge : storeSlice.currentAge;
  const retirementAge = externalInputs ? externalInputs.retirementAge : storeSlice.retirementAge;
  const isFutureOnlyDebtMode = propDebtFlags ? propDebtFlags.isFutureOnlyDebtMode : storeSlice.isFutureOnlyDebtMode;

  const handleDebtsChange = useCallback(
    (newDebts: DebtItem[]) => {
      updateField('debts', newDebts);
    },
    [updateField]
  );

  const handleDebtStrategyChange = useCallback(
    (newStrategy: DebtRepaymentStrategy) => {
      updateField('debtStrategy', newStrategy);
    },
    [updateField]
  );

  if (externalOnChange && externalInputs) {
    return (
      <DebtsManager
        debts={externalInputs.debts || EMPTY_DEBTS}
        currentAge={currentAge}
        retirementAge={retirementAge}
        debtStrategy={externalInputs.debtStrategy}
        isFutureOnlyMode={isFutureOnlyDebtMode}
        onUpdateDebts={handleDebtsChange}
        onUpdateStrategy={handleDebtStrategyChange}
        onChange={handleDebtsChange}
      />
    );
  }

  return (
    <DebtsManager
      currentAge={currentAge}
      retirementAge={retirementAge}
      isFutureOnlyMode={isFutureOnlyDebtMode}
    />
  );
});

DebtsTab.displayName = 'DebtsTab';
