import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { useNapReminderObserver } from '@/lib/notifications';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = useTheme();
  useNapReminderObserver();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="nap/start"
          options={{ title: '仮眠を記録する', presentation: 'modal' }}
        />
        <Stack.Screen name="nap/result" options={{ title: '仮眠後の記録' }} />
        <Stack.Screen
          name="sleep/log"
          options={{ title: '睡眠を記録する', presentation: 'modal' }}
        />
      </Stack>
    </ThemeProvider>
  );
}
