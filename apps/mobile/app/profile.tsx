import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { achievementDefinitions, languages, type Language, type Travelcard } from '@reise/shared';
import { Card, ScreenHeader } from '../src/components/ui';
import { useReiseStore } from '../src/store';
import { palette } from '../src/theme';

const travelcards: { id: Travelcard; label: string }[] = [
  { id: 'none', label: 'None' }, { id: 'half_fare', label: 'Half Fare' },
  { id: 'ga', label: 'GA' }, { id: 'regional', label: 'Regional' },
];

export default function ProfileScreen() {
  const { language, setLanguage, travelcard, setTravelcard, unlockedAchievements } = useReiseStore();
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}><ScreenHeader eyebrow="Local preferences" title="Your Reise" />
    <Card style={styles.profile}><View style={styles.avatar}><Text style={styles.avatarText}>RC</Text></View><View><Text style={styles.name}>Reise Companion</Text><Text style={styles.local}>Preferences stored on this device</Text></View></Card>
    <Text style={styles.sectionTitle}>Achievements</Text><Text style={styles.sectionIntro}>{unlockedAchievements.length} of {achievementDefinitions.length} unlocked</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.achievements}>{achievementDefinitions.map((achievement, index) => { const unlocked = unlockedAchievements.includes(achievement.id); const badgeStyle = [styles.badgeGold, styles.badgeGreen, styles.badgeBlue, styles.badgePink][index % 4]; return <View key={achievement.id} style={styles.achievementWrap}><View style={[styles.achievement, unlocked ? badgeStyle : styles.locked]}><Text style={[styles.achievementIcon, !unlocked && styles.lockedIcon]}>{unlocked ? achievement.icon : '—'}</Text></View><Text numberOfLines={2} style={styles.achievementTitle}>{achievement.title}</Text></View>; })}</ScrollView>
    <Text style={styles.sectionTitle}>Language</Text><Card><View style={styles.options}>{languages.map((item) => <Text key={item} onPress={() => setLanguage(item as Language)} style={[styles.option, language === item && styles.optionActive]}>{item.toUpperCase()}</Text>)}</View></Card>
    <Text style={styles.sectionTitle}>Travelcard</Text><Card><View style={styles.options}>{travelcards.map((item) => <Text key={item.id} onPress={() => setTravelcard(item.id)} style={[styles.option, travelcard === item.id && styles.optionActive]}>{item.label}</Text>)}</View></Card>
    <Text style={styles.sectionTitle}>Privacy & data</Text><Card><Text style={styles.setting}>Location controls <Text style={styles.chevron}>›</Text></Text><Text style={styles.setting}>Notification preferences <Text style={styles.chevron}>›</Text></Text><Text style={styles.setting}>Delete local data <Text style={styles.chevron}>›</Text></Text><Text style={styles.settingLast}>About Reise <Text style={styles.chevron}>›</Text></Text></Card>
  </ScrollView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F7F7' }, content: { padding: 20, paddingTop: 66, paddingBottom: 32 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14 }, avatar: { width: 54, height: 54, borderRadius: 18, backgroundColor: palette.red, justifyContent: 'center', alignItems: 'center' }, avatarText: { color: palette.paper, fontWeight: '900', fontSize: 17 }, name: { color: palette.ink, fontWeight: '800', fontSize: 18 }, local: { color: palette.slate, marginTop: 4, fontSize: 11 },
  sectionTitle: { color: palette.ink, fontSize: 19, fontWeight: '800', marginTop: 26 }, sectionIntro: { color: palette.slate, fontSize: 12, marginTop: 4, marginBottom: 14 }, achievements: { gap: 14, paddingRight: 20 }, achievementWrap: { width: 88, alignItems: 'center' },
  achievement: { width: 70, height: 70, borderRadius: 35, borderWidth: 4, borderColor: palette.paper, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 8, elevation: 3 },
  badgeGold: { backgroundColor: '#FFC34D' }, badgeGreen: { backgroundColor: '#9DE3B2' }, badgeBlue: { backgroundColor: '#6E9BFF' }, badgePink: { backgroundColor: '#F3A6CF' },
  locked: { backgroundColor: '#E2E2E2', borderColor: '#F7F7F7' }, achievementIcon: { color: palette.ink, fontSize: 26, fontWeight: '900' }, lockedIcon: { color: '#999' }, achievementTitle: { color: palette.ink, fontSize: 11, lineHeight: 14, textAlign: 'center', fontWeight: '700', marginTop: 8 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, option: { color: palette.ink, backgroundColor: palette.mist, borderRadius: 18, overflow: 'hidden', paddingHorizontal: 13, paddingVertical: 9, fontSize: 12, fontWeight: '700' }, optionActive: { backgroundColor: palette.red, color: palette.paper },
  setting: { color: palette.ink, fontSize: 15, fontWeight: '600', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: palette.line }, settingLast: { color: palette.ink, fontSize: 15, fontWeight: '600', paddingTop: 14 }, chevron: { color: palette.red },
});
