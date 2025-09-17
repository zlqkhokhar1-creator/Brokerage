import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import 'react-native-gesture-handler';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider } from 'react-native-paper';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

import { useColorScheme } from '@/hooks/useColorScheme';
import { queryClient } from '@/src/lib/queryClient';
import { getPaperTheme } from '@/src/lib/theme';
import { MarketSocketProvider } from '@/src/providers/MarketSocketProvider';
import { MembershipProvider } from '@/src/contexts/MembershipContext';
import { NotificationsProvider } from '@/src/providers/NotificationsProvider';
import { AuthProvider } from '@/src/contexts/AuthContext';
import { SnackbarProvider } from '@/src/providers/SnackbarProvider';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider theme={getPaperTheme(colorScheme)}>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <MembershipProvider>
                <MarketSocketProvider>
                  <NotificationsProvider>
                    <SnackbarProvider>
                      <BottomSheetModalProvider>
                        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                          <Stack>
                            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                            <Stack.Screen name="+not-found" />
                            <Stack.Screen name="auth/login" options={{ headerShown: false }} />
                            <Stack.Screen name="auth/register" options={{ headerShown: false }} />
                          </Stack>
                          <StatusBar style="auto" />
                        </ThemeProvider>
                      </BottomSheetModalProvider>
                    </SnackbarProvider>
                  </NotificationsProvider>
                </MarketSocketProvider>
              </MembershipProvider>
            </AuthProvider>
          </QueryClientProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
