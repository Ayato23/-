import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

function TabIcon({ symbol, color }: { symbol: string; color: ColorValue }) {
  return <Text style={{ fontSize: 20, color }}>{symbol}</Text>;
}

export default function TabLayout() {
  const theme = useTheme();
  const tabs = [
    { name: 'index', title: 'コーデ', symbol: '👗' },
    { name: 'closet', title: 'クローゼット', symbol: '🧥' },
    { name: 'recommend', title: 'おすすめ', symbol: '🛍' },
    { name: 'history', title: '履歴', symbol: '🗓' },
  ];

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerShadowVisible: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border },
        sceneStyle: { backgroundColor: theme.background },
      }}
    >
      {tabs.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ color }) => <TabIcon symbol={t.symbol} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}
