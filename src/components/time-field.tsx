import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { isValidTimeString } from '@/lib/date';
import { useTheme } from '@/hooks/use-theme';

export interface TimeFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function TimeField({ label, value, onChange }: TimeFieldProps) {
  const theme = useTheme();
  const valid = value.length === 0 || isValidTimeString(value);

  return (
    <View style={styles.container}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="HH:MM"
        placeholderTextColor={theme.textSecondary}
        keyboardType="numbers-and-punctuation"
        maxLength={5}
        style={[
          styles.input,
          {
            color: theme.text,
            backgroundColor: theme.backgroundElement,
            borderColor: valid ? theme.border : theme.danger,
          },
        ]}
      />
      {!valid && (
        <ThemedText type="small" themeColor="danger">
          HH:MM形式で入力してください
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    fontSize: 20,
    fontVariant: ['tabular-nums'],
  },
});
