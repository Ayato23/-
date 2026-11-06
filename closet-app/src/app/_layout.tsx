import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { StoreProvider } from '@/state/store';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = useTheme();

  return (
    <StoreProvider>
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
        <Stack.Screen name="item/new" options={{ title: '服を追加' }} />
        <Stack.Screen name="item/[id]" options={{ title: '服の詳細' }} />
        <Stack.Screen name="outfit/manual" options={{ title: '手組み' }} />
        <Stack.Screen name="outfit/[id]" options={{ title: 'コーデの詳細' }} />
        <Stack.Screen name="settings" options={{ title: '設定' }} />
      </Stack>
    </ThemeProvider>
    </StoreProvider>
  );
}
