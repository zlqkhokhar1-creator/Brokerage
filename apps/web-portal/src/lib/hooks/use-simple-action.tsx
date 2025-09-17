'use client';

import { useState, useTransition } from 'react';

// Simple action state hook for forms
export function useSimpleAction<TState>(
  action: (prevState: TState, formData: FormData) => Promise<TState>,
  initialState: TState
) {
  const [state, setState] = useState(initialState);
  const [isPending, startTransition] = useTransition();

  const submitAction = async (formData: FormData) => {
    startTransition(async () => {
      const newState = await action(state, formData);
      setState(newState);
    });
  };

  return {
    state,
    submitAction,
    isPending,
  };
}

// Optimistic updates hook
export function useOptimisticUpdate<TData>(
  data: TData,
  updateFn: (currentState: TData, optimisticValue: TData) => TData
) {
  const [optimisticData, setOptimisticData] = useState(data);

  const addOptimistic = (optimisticValue: TData) => {
    setOptimisticData(updateFn(optimisticData, optimisticValue));
  };

  return {
    optimisticData,
    addOptimistic,
  };
}
