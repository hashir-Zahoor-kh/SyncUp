import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useAuth } from '../../src/contexts/AuthContext';
import { useProfile } from '../../src/contexts/ProfileContext';
import { useGoals } from '../../src/contexts/GoalContext';
import { useReactions } from '../../src/contexts/ReactionContext';
import { usePushNotifications } from '../../src/hooks/usePushNotifications';
import { Avatar } from '../../src/components/Avatar';
import { GoalCard } from '../../src/components/GoalCard';
import { ProgressRing } from '../../src/components/ProgressRing';
import { WeekBar } from '../../src/components/WeekBar';
import { GOAL_TAGS, type GoalTag } from '../../src/schemas/goal';

const MAX_GOALS = 3;
const SNAP_POINTS = ['55%'];

function getWeekNumber(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
}

function ringPercentage(goals: { completed_at: string | null }[]): number {
  if (goals.length === 0) return 0;
  const completed = goals.filter((g) => g.completed_at != null).length;
  return Math.round((completed / goals.length) * 100);
}

export default function BoardScreen(): React.JSX.Element {
  const { signOut } = useAuth();
  const { profile } = useProfile();
  const {
    goals,
    partnerGoals,
    connection,
    partnerProfile,
    loading,
    addGoal,
    completeGoal,
    deleteGoal,
    refresh,
    realtimeStatus,
  } = useGoals();
  const { addReaction, removeReaction, getReactionsForGoal, getMyReaction } = useReactions();
  const { requestAndRegister } = usePushNotifications();
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);
  const [goalText, setGoalText] = useState('');
  const [selectedTag, setSelectedTag] = useState<GoalTag>('Health');
  const [addError, setAddError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const sheetRef = useRef<BottomSheet>(null);

  const onRefresh = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const openSheet = (): void => {
    setGoalText('');
    setSelectedTag('Health');
    setAddError(null);
    sheetRef.current?.expand();
  };

  const closeSheet = (): void => {
    sheetRef.current?.close();
  };

  const handleAddGoal = async (): Promise<void> => {
    setAddError(null);
    setSubmitting(true);
    const isFirstGoal = goals.length === 0;
    const { error } = await addGoal({ text: goalText.trim(), tag: selectedTag });
    setSubmitting(false);
    if (error) {
      setAddError(error);
      return;
    }
    closeSheet();
    // Request notification permission after the first goal is added (better acceptance rate)
    if (isFirstGoal) {
      void requestAndRegister();
    }
  };

  const statusDotColor =
    realtimeStatus === 'connected'
      ? '#1D9E75'
      : realtimeStatus === 'connecting'
        ? '#FAC775'
        : '#FF6B6B';

  const myPercentage = ringPercentage(goals);
  const partnerPercentage = ringPercentage(partnerGoals);
  const weekNum = getWeekNumber();

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color="#D85A30" />
        </View>
      </SafeAreaView>
    );
  }

  const hasNoConnection = !connection;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>SyncUp</Text>
        <View style={styles.headerRight}>
          <View style={styles.weekPill}>
            <Text style={styles.weekText}>Week {weekNum}</Text>
          </View>
          <View style={[styles.statusDot, { backgroundColor: statusDotColor }]} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor="#D85A30"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Week Progress Bar */}
        <WeekBar />

        {hasNoConnection ? (
          /* ── No Connection State ──────────────────────────── */
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔗</Text>
            <Text style={styles.emptyTitle}>Connect with someone</Text>
            <Text style={styles.emptySubtitle}>
              Invite a friend or partner to start sharing weekly goals.
            </Text>
            <TouchableOpacity style={styles.inviteBtn} onPress={() => router.push('/(app)/invite')}>
              <Text style={styles.inviteBtnText}>Invite Someone</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* ── Your Goals Section ──────────────────────────── */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionLeft}>
                  {profile && <Avatar profile={profile} size={32} />}
                  <Text style={styles.sectionName}>You</Text>
                </View>
                <ProgressRing percentage={myPercentage} color="#D85A30" size={32} />
              </View>

              {goals.length === 0 ? (
                <View style={styles.sectionEmpty}>
                  <Text style={styles.sectionEmptyText}>Add your first 3 goals for this week</Text>
                </View>
              ) : (
                goals.map((g) => (
                  <GoalCard
                    key={g.id}
                    goal={g}
                    isOwn
                    onComplete={completeGoal}
                    onDelete={deleteGoal}
                  />
                ))
              )}

              <TouchableOpacity
                style={[styles.addBtn, goals.length >= MAX_GOALS && styles.addBtnDisabled]}
                onPress={openSheet}
                disabled={goals.length >= MAX_GOALS}
              >
                <Text
                  style={[
                    styles.addBtnText,
                    goals.length >= MAX_GOALS && styles.addBtnTextDisabled,
                  ]}
                >
                  {goals.length >= MAX_GOALS ? 'Max 3 goals' : '+ Add a goal'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* ── Partner Goals Section ───────────────────────── */}
            <View style={[styles.section, styles.sectionPartner]}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionLeft}>
                  {partnerProfile && <Avatar profile={partnerProfile} size={32} />}
                  <Text style={styles.sectionName}>
                    {partnerProfile?.display_name ?? 'Partner'}
                  </Text>
                </View>
                <ProgressRing percentage={partnerPercentage} color="#1D9E75" size={32} />
              </View>

              {partnerGoals.length === 0 ? (
                <View style={styles.sectionEmpty}>
                  <Text style={styles.sectionEmptyText}>
                    Waiting for {partnerProfile?.display_name ?? 'your partner'} to add their goals
                  </Text>
                </View>
              ) : (
                partnerGoals.map((g) => (
                  <GoalCard
                    key={g.id}
                    goal={g}
                    isOwn={false}
                    goalReactions={getReactionsForGoal(g.id)}
                    myReaction={getMyReaction(g.id)}
                    onAddReaction={addReaction}
                    onRemoveReaction={removeReaction}
                  />
                ))
              )}
            </View>
          </>
        )}

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={() => void signOut()}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Add Goal Bottom Sheet ────────────────────────────── */}
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={SNAP_POINTS}
        enablePanDownToClose
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.sheetHandle}
      >
        <BottomSheetView style={styles.sheetContent}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.sheetKav}
          >
            <Text style={styles.sheetTitle}>New goal</Text>

            <TextInput
              style={styles.sheetInput}
              placeholder="What do you want to achieve this week?"
              placeholderTextColor="#AAA"
              value={goalText}
              onChangeText={setGoalText}
              maxLength={140}
              multiline
              returnKeyType="done"
              autoFocus
            />
            <Text style={styles.charCount}>{goalText.length}/140</Text>

            <Text style={styles.tagLabel}>Tag</Text>
            <View style={styles.tagRow}>
              {GOAL_TAGS.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={[styles.tagPill, selectedTag === tag && styles.tagPillActive]}
                  onPress={() => setSelectedTag(tag)}
                >
                  <Text
                    style={[styles.tagPillText, selectedTag === tag && styles.tagPillTextActive]}
                  >
                    {tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {addError ? <Text style={styles.addError}>{addError}</Text> : null}

            <TouchableOpacity
              style={[
                styles.sheetAddBtn,
                (submitting || !goalText.trim()) && styles.sheetAddBtnDisabled,
              ]}
              onPress={() => void handleAddGoal()}
              disabled={submitting || !goalText.trim()}
            >
              <Text style={styles.sheetAddBtnText}>{submitting ? 'Adding…' : 'Add Goal'}</Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </BottomSheetView>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FBF7F2' },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  logo: { fontSize: 22, fontFamily: 'Fraunces_700Bold', color: '#D85A30' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  weekPill: {
    backgroundColor: '#FBEEE8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  weekText: { fontSize: 12, color: '#D85A30', fontFamily: 'DMSans_700Bold' },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 24 },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 22, fontFamily: 'Fraunces_700Bold', color: '#2C2C2A' },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontFamily: 'DMSans_400Regular',
    lineHeight: 20,
  },
  inviteBtn: {
    backgroundColor: '#D85A30',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  inviteBtnText: { color: '#FFF', fontFamily: 'DMSans_700Bold', fontSize: 15 },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: '#E8E0D8',
    padding: 16,
    marginBottom: 16,
  },
  sectionPartner: { marginBottom: 8 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionName: { fontSize: 16, fontFamily: 'DMSans_700Bold', color: '#2C2C2A' },
  sectionEmpty: { paddingVertical: 12 },
  sectionEmptyText: {
    fontSize: 13,
    color: '#AAA',
    fontFamily: 'DMSans_400Regular',
    textAlign: 'center',
  },
  addBtn: {
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D85A30',
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  addBtnDisabled: { borderColor: '#D3D1C7' },
  addBtnText: { fontSize: 14, color: '#D85A30', fontFamily: 'DMSans_700Bold' },
  addBtnTextDisabled: { color: '#D3D1C7' },
  signOutBtn: {
    marginTop: 16,
    padding: 14,
    backgroundColor: '#F5F0EA',
    borderRadius: 12,
    alignItems: 'center',
  },
  signOutText: { fontSize: 14, color: '#888', fontFamily: 'DMSans_400Regular' },
  sheetBg: { backgroundColor: '#FBF7F2' },
  sheetHandle: { backgroundColor: '#D3D1C7' },
  sheetContent: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  sheetKav: { flex: 1, gap: 12 },
  sheetTitle: {
    fontSize: 20,
    fontFamily: 'Fraunces_700Bold',
    color: '#2C2C2A',
    marginBottom: 4,
  },
  sheetInput: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#E8E0D8',
    padding: 14,
    fontSize: 15,
    color: '#2C2C2A',
    fontFamily: 'DMSans_400Regular',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 11,
    color: '#AAA',
    textAlign: 'right',
    fontFamily: 'DMSans_400Regular',
  },
  tagLabel: { fontSize: 13, fontFamily: 'DMSans_700Bold', color: '#2C2C2A' },
  tagRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tagPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F0EFEE',
  },
  tagPillActive: { backgroundColor: '#FBEEE8' },
  tagPillText: { fontSize: 13, color: '#666', fontFamily: 'DMSans_400Regular' },
  tagPillTextActive: { color: '#D85A30', fontFamily: 'DMSans_700Bold' },
  addError: {
    fontSize: 13,
    color: '#FF6B6B',
    textAlign: 'center',
    fontFamily: 'DMSans_400Regular',
  },
  sheetAddBtn: {
    backgroundColor: '#D85A30',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  sheetAddBtnDisabled: { backgroundColor: '#E8E0D8' },
  sheetAddBtnText: { color: '#FFF', fontFamily: 'DMSans_700Bold', fontSize: 16 },
});
