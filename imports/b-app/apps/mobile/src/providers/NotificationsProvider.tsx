import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { getApi } from '@/src/lib/api';

type NotificationsContextValue = {
  expoPushToken: string | null;
  requestPermissions: () => Promise<boolean>;
  scheduleLocalAlert: (title: string, body: string, data?: any) => Promise<void>;
  createPriceAlert: (params: { symbol: string; condition: 'above' | 'below'; targetPrice: number; options?: any }) => Promise<any>;
};

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const responseListener = useRef<any>();

  const requestPermissions = async (): Promise<boolean> => {
    if (!Device.isDevice) return false;
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return false;
    const token = await Notifications.getExpoPushTokenAsync();
    setExpoPushToken(token.data);
    return true;
  };

  useEffect(() => {
    requestPermissions();
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
    responseListener.current = Notifications.addNotificationResponseReceivedListener(() => {});
    return () => {
      if (responseListener.current) Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  const scheduleLocalAlert = async (title: string, body: string, data?: any) => {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data },
      trigger: null,
    });
  };

  const createPriceAlert = async ({ symbol, condition, targetPrice, options = {} }: { symbol: string; condition: 'above' | 'below'; targetPrice: number; options?: any }) => {
    const api = await getApi();
    const { data } = await api.post('/alerts/price', {
      symbol,
      condition,
      targetPrice,
      options,
    });
    return data.data;
  };

  const value = useMemo(() => ({ expoPushToken, requestPermissions, scheduleLocalAlert, createPriceAlert }), [expoPushToken]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}

