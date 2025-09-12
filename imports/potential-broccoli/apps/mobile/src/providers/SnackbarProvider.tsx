import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Snackbar } from 'react-native-paper';

type SnackbarMessage = {
  text: string;
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
};

type SnackbarContextValue = {
  show: (msg: SnackbarMessage) => void;
};

const SnackbarContext = createContext<SnackbarContextValue | undefined>(undefined);

export function SnackbarProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState<SnackbarMessage | null>(null);

  const show = useCallback((msg: SnackbarMessage) => {
    setMessage(msg);
    setVisible(true);
  }, []);

  const onDismiss = () => setVisible(false);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      <Snackbar
        visible={visible}
        onDismiss={onDismiss}
        duration={message?.durationMs ?? 2500}
        action={message?.actionLabel ? { label: message.actionLabel, onPress: message.onAction } : undefined}
      >
        {message?.text}
      </Snackbar>
    </SnackbarContext.Provider>
  );
}

export function useSnackbar() {
  const ctx = useContext(SnackbarContext);
  if (!ctx) throw new Error('useSnackbar must be used within SnackbarProvider');
  return ctx;
}

