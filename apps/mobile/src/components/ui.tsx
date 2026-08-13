import type { PropsWithChildren, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { palette, shadow } from '../theme';

export function ScreenHeader({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return <View style={styles.header}><View>{eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}<Text style={styles.title}>{title}</Text></View>{action}</View>;
}

export function Card({ children, style }: PropsWithChildren<{ style?: object }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({ label, onPress, secondary = false, disabled = false }: { label: string; onPress(): void; secondary?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, secondary && styles.secondaryButton, disabled && styles.disabledButton, pressed && !disabled && styles.pressed]}><Text style={[styles.buttonText, secondary && styles.secondaryButtonText]}>{label}</Text></Pressable>;
}

export function SourceLabel({ children, tone = 'neutral' }: PropsWithChildren<{ tone?: 'neutral' | 'success' | 'warning' }>) {
  return <View style={[styles.source, tone === 'success' && styles.sourceSuccess, tone === 'warning' && styles.sourceWarning]}><Text style={[styles.sourceText, tone === 'success' && styles.sourceSuccessText, tone === 'warning' && styles.sourceWarningText]}>{children}</Text></View>;
}

export function Metric({ label, value }: { label: string; value: string }) {
  return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 22 },
  eyebrow: { color: palette.red, fontSize: 12, lineHeight: 16, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { color: palette.ink, fontSize: 31, lineHeight: 36, fontWeight: '800', letterSpacing: -1.1 },
  card: { backgroundColor: palette.paper, borderRadius: 22, borderWidth: 1, borderColor: '#ECECEC', padding: 18, ...shadow },
  button: { minHeight: 52, backgroundColor: palette.red, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  secondaryButton: { backgroundColor: palette.paper, borderWidth: 1.5, borderColor: palette.ink },
  disabledButton: { opacity: 0.45 }, pressed: { transform: [{ scale: 0.985 }] },
  buttonText: { color: palette.paper, fontSize: 16, fontWeight: '800' }, secondaryButtonText: { color: palette.ink },
  source: { alignSelf: 'flex-start', backgroundColor: palette.mist, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  sourceSuccess: { backgroundColor: palette.successSoft }, sourceWarning: { backgroundColor: palette.warningSoft },
  sourceText: { color: palette.slate, fontSize: 10, fontWeight: '800', letterSpacing: 0.7, textTransform: 'uppercase' },
  sourceSuccessText: { color: palette.success }, sourceWarningText: { color: palette.warning },
  metric: { flex: 1 }, metricValue: { color: palette.ink, fontSize: 22, fontWeight: '800' }, metricLabel: { color: palette.slate, fontSize: 12, marginTop: 2 },
});
