import { useLocalSearchParams } from 'expo-router';

import { OutfitActions } from '@/components/OutfitActions';
import { OutfitView } from '@/components/OutfitView';
import { ScoreBreakdown } from '@/components/ScoreBreakdown';
import { Body, Button, Card, Label, Screen } from '@/components/ui';
import { weatherIcon } from '@/components/WeatherBar';
import { OCCASIONS, TASTES, labelOf, subcategoryLabel } from '@/domain/catalog';
import { ruleCritic } from '@/domain/critic';
import type { Item } from '@/domain/types';
import { DEFAULT_WEATHER } from '@/services/weatherApi';
import { todayISO, useStore } from '@/state/store';

export default function OutfitDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { outfits, items, wearLogs, profile, updateOutfit, logWear } = useStore();
  const outfit = outfits.find((o) => o.id === id);
  if (!outfit) {
    return (
      <Screen>
        <Body muted>このコーデは見つかりませんでした。</Body>
      </Screen>
    );
  }
  const byId = new Map(items.map((i) => [i.id, i]));
  const resolved = outfit.itemIds.map((i) => byId.get(i));
  const existing = resolved.filter((i): i is Item => !!i);
  const today = todayISO();
  const weather = outfit.weather ?? DEFAULT_WEATHER(today);
  const occasion = outfit.occasion ?? 'everyday';
  const taste = outfit.taste ?? 'casual';
  const evaluation = ruleCritic.evaluate(existing, { occasion, taste, weather, profile, today }, items);
  const wornToday = wearLogs.some((w) => w.outfitId === outfit.id && w.date === today);
  const wearCount = wearLogs.filter((w) => w.outfitId === outfit.id).length;

  const applySwap = (fromId: string, toId: string) =>
    updateOutfit(outfit.id, { itemIds: outfit.itemIds.map((i) => (i === fromId ? toId : i)) });

  return (
    <Screen>
      <Body muted>
        {labelOf(OCCASIONS, occasion)} ・ {labelOf(TASTES, taste)} ・ {weatherIcon(weather)} {Math.round(weather.tempMax)}°/
        {Math.round(weather.tempMin)}° ・ {outfit.source === 'manual' ? '手組み' : '自動提案'} ・ 着用 {wearCount} 回
      </Body>
      <Card>
        <OutfitView items={resolved} />
      </Card>
      <Card>
        <Label>評価</Label>
        <ScoreBreakdown evaluation={evaluation} />
        {evaluation.swaps.map((s) => {
          const from = byId.get(s.fromItemId);
          const to = byId.get(s.toItemId);
          if (!from || !to) return null;
          return (
            <Button
              key={`${s.fromItemId}-${s.toItemId}`}
              small
              variant="secondary"
              title={`${subcategoryLabel(from.subcategory)} → ${to.brand ? `${to.brand} ` : ''}${subcategoryLabel(to.subcategory)}に替えると +${s.gain}点`}
              onPress={() => applySwap(s.fromItemId, s.toItemId)}
            />
          );
        })}
      </Card>
      <Card>
        <OutfitActions
          rating={outfit.rating}
          rejected={outfit.rejected}
          wornToday={wornToday}
          onRate={(rating) => updateOutfit(outfit.id, { rating, rejected: false })}
          onReject={() => updateOutfit(outfit.id, { rejected: !outfit.rejected })}
          onWear={() => logWear(outfit.id, today)}
        />
      </Card>
    </Screen>
  );
}
