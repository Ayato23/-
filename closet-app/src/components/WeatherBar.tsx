import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { WeatherSnapshot } from '@/domain/types';
import { isRainy } from '@/domain/weather';
import { useTheme } from '@/hooks/use-theme';
import { DEFAULT_WEATHER, fetchForecast, getCurrentCoords } from '@/services/weatherApi';
import { todayISO, useStore } from '@/state/store';

import { ChipSelect } from './ChipSelect';
import { Body, Button, Card } from './ui';

export function weatherIcon(w: WeatherSnapshot): string {
  if (w.snow) return '❄️';
  if (isRainy(w)) return '☔';
  return '☀️';
}

const DOW = ['日', '月', '火', '水', '木', '金', '土'];
function dayLabel(date: string, idx: number): string {
  if (idx === 0) return '今日';
  if (idx === 1) return '明日';
  const d = new Date(`${date}T00:00:00`);
  return `${d.getMonth() + 1}/${d.getDate()}(${DOW[d.getDay()]})`;
}

type Kind = 'sunny' | 'rain' | 'snow';
const KINDS: { id: Kind; label: string }[] = [
  { id: 'sunny', label: '☀️ 晴れ・くもり' },
  { id: 'rain', label: '☔ 雨' },
  { id: 'snow', label: '❄️ 雪' },
];

export function WeatherBar({ value, onChange }: { value: WeatherSnapshot | null; onChange: (w: WeatherSnapshot) => void }) {
  const theme = useTheme();
  const { profile, ready } = useStore();
  const [days, setDays] = useState<WeatherSnapshot[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [maxText, setMaxText] = useState('');
  const [minText, setMinText] = useState('');
  const [kind, setKind] = useState<Kind>('sunny');

  useEffect(() => {
    if (!ready) return;
    let alive = true;
    const fallback = (msg: string) => {
      if (!alive) return;
      setNote(msg);
      setDays([]);
      onChange(DEFAULT_WEATHER(todayISO()));
    };
    // 取得を待つ間も操作できるよう、まず仮の天気を入れておく
    setNote('天気を取得中…(仮の天気で組めます)');
    onChange(DEFAULT_WEATHER(todayISO()));
    (async () => {
      if (!profile.useLocation) return fallback('位置情報オフのため手動設定です(タップして変更)');
      const coords = await getCurrentCoords();
      if (!coords) return fallback('天気を取得できなかったため手動設定です(タップして変更)');
      try {
        const list = await fetchForecast(coords.lat, coords.lon);
        if (!alive) return;
        if (list.length === 0) return fallback('天気を取得できなかったため手動設定です(タップして変更)');
        setDays(list);
        setNote(null);
        onChange(list[0]);
      } catch {
        fallback('天気を取得できなかったため手動設定です(タップして変更)');
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, profile.useLocation]);

  const openEditor = () => {
    if (value) {
      setMaxText(String(Math.round(value.tempMax)));
      setMinText(String(Math.round(value.tempMin)));
      setKind(value.snow ? 'snow' : isRainy(value) ? 'rain' : 'sunny');
    }
    setEditing(true);
  };

  const applyManual = () => {
    const max = Number(maxText);
    const min = Number(minText);
    const base = value ?? DEFAULT_WEATHER(todayISO());
    onChange({
      date: base.date,
      tempMax: Number.isFinite(max) && maxText !== '' ? max : base.tempMax,
      tempMin: Number.isFinite(min) && minText !== '' ? min : base.tempMin,
      precipProb: kind === 'sunny' ? 0 : 80,
      snow: kind === 'snow',
      manual: true,
    });
    setEditing(false);
  };

  const inputStyle = [styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }];

  return (
    <Card>
      {days.length > 0 && (
        <View style={styles.days}>
          {days.map((d, i) => {
            const on = value?.date === d.date && !value.manual;
            return (
              <Pressable
                key={d.date}
                accessibilityRole="button"
                onPress={() => onChange(d)}
                style={[styles.day, { backgroundColor: on ? theme.accent : theme.chip }]}
              >
                <Text style={{ color: on ? theme.accentText : theme.text, fontSize: 12 }}>{dayLabel(d.date, i)}</Text>
                <Text style={{ fontSize: 18 }}>{weatherIcon(d)}</Text>
                <Text style={{ color: on ? theme.accentText : theme.textSecondary, fontSize: 11 }}>
                  {Math.round(d.tempMax)}°/{Math.round(d.tempMin)}°
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
      {value && (
        <Pressable accessibilityRole="button" onPress={openEditor}>
          <Text style={{ color: theme.text, fontSize: 15 }}>
            {weatherIcon(value)} 最高 {Math.round(value.tempMax)}℃ / 最低 {Math.round(value.tempMin)}℃ ・ 降水 {value.precipProb}%
            {value.manual ? '(手動)' : ''} <Text style={{ color: theme.accent }}>変更</Text>
          </Text>
        </Pressable>
      )}
      {note && <Body muted>{note}</Body>}
      {editing && (
        <View style={styles.editor}>
          <ChipSelect options={KINDS} value={kind} onChange={setKind} />
          <View style={styles.temps}>
            <Text style={{ color: theme.text }}>最高</Text>
            <TextInput style={inputStyle} value={maxText} onChangeText={setMaxText} keyboardType="numbers-and-punctuation" accessibilityLabel="最高気温" />
            <Text style={{ color: theme.text }}>℃ 最低</Text>
            <TextInput style={inputStyle} value={minText} onChangeText={setMinText} keyboardType="numbers-and-punctuation" accessibilityLabel="最低気温" />
            <Text style={{ color: theme.text }}>℃</Text>
          </View>
          <Button title="この天気で組む" small onPress={applyManual} />
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  days: { flexDirection: 'row', gap: 6 },
  day: { flex: 1, alignItems: 'center', borderRadius: 10, paddingVertical: 6, gap: 2 },
  editor: { gap: 8 },
  temps: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  input: { width: 56, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, fontSize: 15 },
});
