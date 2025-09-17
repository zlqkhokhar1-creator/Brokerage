'use client';

import { useState, useCallback, useOptimistic } from 'react';

// Generic action state hook for forms and async operations
export function useAsyncAction<TState, TAction = any>(
  action: (prevState: TState, formData: TAction) => Promise<TState>,
  initialState: TState
) {
  const [state, setState] = useState<TState>(initialState);
  const [isPending, setIsPending] = useState(false);
  
  const submitAction = useCallback(async (formData: TAction) => {
    setIsPending(true);
    try {
      const newState = await action(state, formData);
      setState(newState);
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setIsPending(false);
    }
  }, [action, state]);
  
  return {
    state,
    submitAction,
    isPending,
  };
}

// Optimistic updates hook for better UX
export function useOptimisticState<TData>(
  data: TData,
  updateFn: (currentState: TData, optimisticValue: TData) => TData
) {
  const [optimisticData, addOptimistic] = useOptimistic(data, updateFn);
  
  return {
    optimisticData,
    addOptimistic,
  };
}

// Trading-specific action state hook
export function useTradingAction() {
  return useAsyncAction(
    async (prevState: any, formData: FormData) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const action = formData.get('action') as string;
      const symbol = formData.get('symbol') as string;
      const quantity = formData.get('quantity') as string;
      
      return {
        ...prevState,
        lastAction: action,
        lastSymbol: symbol,
        lastQuantity: quantity,
        timestamp: new Date().toISOString(),
        success: true,
      };
    },
    {
      lastAction: null,
      lastSymbol: null,
      lastQuantity: null,
      timestamp: null,
      success: false,
    }
  );
}
