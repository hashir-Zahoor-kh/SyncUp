import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { goalSchema, type GoalFormData } from '../schemas/goal';
import type { Database } from '../types/database';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type GoalRow = Database['public']['Tables']['goals']['Row'];
type ConnectionRow = Database['public']['Tables']['connections']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];

type RealtimeStatus = 'connected' | 'connecting' | 'disconnected';

interface GoalContextValue {
  goals: GoalRow[];
  partnerGoals: GoalRow[];
  connection: ConnectionRow | null;
  partnerProfile: ProfileRow | null;
  loading: boolean;
  weekStart: string;
  addGoal: (data: GoalFormData) => Promise<{ error: string | null }>;
  completeGoal: (goalId: string) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;
  refresh: () => Promise<void>;
  realtimeStatus: RealtimeStatus;
}

const GoalContext = createContext<GoalContextValue | null>(null);

function getCurrentWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0]!;
}

export function GoalProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { user } = useAuth();
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [partnerGoals, setPartnerGoals] = useState<GoalRow[]>([]);
  const [connection, setConnection] = useState<ConnectionRow | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('connecting');
  const weekStart = getCurrentWeekStart();

  const connectionRef = useRef<ConnectionRow | null>(null);

  const loadGoals = useCallback(
    async (conn: ConnectionRow): Promise<void> => {
      if (!user) return;
      const { data } = await supabase
        .from('goals')
        .select('*')
        .eq('connection_id', conn.id)
        .eq('week_start', weekStart)
        .order('created_at', { ascending: true });

      const all = data ?? [];
      setGoals(all.filter((g) => g.user_id === user.id));
      setPartnerGoals(all.filter((g) => g.user_id !== user.id));
    },
    [user, weekStart],
  );

  const loadConnection = useCallback(async (): Promise<void> => {
    await Promise.resolve();
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data: connData } = await supabase
      .from('connections')
      .select('*')
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
      .single();

    if (!connData) {
      setLoading(false);
      return;
    }

    setConnection(connData);
    connectionRef.current = connData;

    const partnerId = connData.user_a_id === user.id ? connData.user_b_id : connData.user_a_id;
    const { data: partnerData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', partnerId)
      .single();
    setPartnerProfile(partnerData ?? null);

    await loadGoals(connData);
    setLoading(false);
  }, [user, loadGoals]);

  useEffect(() => {
    void loadConnection();
  }, [loadConnection]);

  const handleRealtimeEvent = useCallback(
    (payload: RealtimePostgresChangesPayload<GoalRow>) => {
      if (!user) return;

      if (payload.eventType === 'INSERT') {
        const newGoal = payload.new;
        if (newGoal.week_start !== weekStart) return;
        if (newGoal.user_id === user.id) {
          setGoals((prev) => {
            if (prev.find((g) => g.id === newGoal.id)) return prev;
            return [...prev, newGoal];
          });
        } else {
          setPartnerGoals((prev) => {
            if (prev.find((g) => g.id === newGoal.id)) return prev;
            return [...prev, newGoal];
          });
        }
      } else if (payload.eventType === 'UPDATE') {
        const updated = payload.new;
        setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
        setPartnerGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      } else if (payload.eventType === 'DELETE') {
        const deletedId = payload.old.id;
        if (deletedId) {
          setGoals((prev) => prev.filter((g) => g.id !== deletedId));
          setPartnerGoals((prev) => prev.filter((g) => g.id !== deletedId));
        }
      }
    },
    [user, weekStart],
  );

  useEffect(() => {
    if (!connection?.id) return;

    setRealtimeStatus('connecting');

    const channel = supabase
      .channel(`goals:${connection.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'goals',
          filter: `connection_id=eq.${connection.id}`,
        },
        (payload) => {
          handleRealtimeEvent(payload as RealtimePostgresChangesPayload<GoalRow>);
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setRealtimeStatus('connected');
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setRealtimeStatus('disconnected');
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [connection?.id, handleRealtimeEvent]);

  const addGoal = useCallback(
    async (data: GoalFormData): Promise<{ error: string | null }> => {
      const parsed = goalSchema.safeParse(data);
      if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid goal' };

      if (!user || !connectionRef.current) return { error: 'No connection' };
      if (goals.length >= 3) return { error: 'You already have 3 goals this week' };

      const optimisticGoal: GoalRow = {
        id: `optimistic-${Date.now()}`,
        user_id: user.id,
        connection_id: connectionRef.current.id,
        text: parsed.data.text,
        tag: parsed.data.tag,
        completed_at: null,
        week_start: weekStart,
        created_at: new Date().toISOString(),
      };

      setGoals((prev) => [...prev, optimisticGoal]);

      const { data: inserted, error } = await supabase
        .from('goals')
        .insert({
          user_id: user.id,
          connection_id: connectionRef.current.id,
          text: parsed.data.text,
          tag: parsed.data.tag,
          week_start: weekStart,
        })
        .select()
        .single();

      if (error) {
        setGoals((prev) => prev.filter((g) => g.id !== optimisticGoal.id));
        return { error: 'Failed to add goal. Please try again.' };
      }

      // Replace optimistic with real row
      if (inserted) {
        setGoals((prev) =>
          prev.map((g) => (g.id === optimisticGoal.id ? (inserted as GoalRow) : g)),
        );
      }

      return { error: null };
    },
    [user, goals.length, weekStart],
  );

  const completeGoal = useCallback(
    async (goalId: string): Promise<void> => {
      if (!user) return;

      const now = new Date().toISOString();
      setGoals((prev) => prev.map((g) => (g.id === goalId ? { ...g, completed_at: now } : g)));

      const { error } = await supabase
        .from('goals')
        .update({ completed_at: now })
        .eq('id', goalId)
        .eq('user_id', user.id);

      if (error) {
        setGoals((prev) => prev.map((g) => (g.id === goalId ? { ...g, completed_at: null } : g)));
      }
    },
    [user],
  );

  const deleteGoal = useCallback(
    async (goalId: string): Promise<void> => {
      if (!user) return;

      const snapshot = goals.find((g) => g.id === goalId);
      setGoals((prev) => prev.filter((g) => g.id !== goalId));

      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', goalId)
        .eq('user_id', user.id);

      if (error && snapshot) {
        setGoals((prev) => [...prev, snapshot]);
      }
    },
    [user, goals],
  );

  const refresh = useCallback(async (): Promise<void> => {
    await loadConnection();
  }, [loadConnection]);

  return (
    <GoalContext.Provider
      value={{
        goals,
        partnerGoals,
        connection,
        partnerProfile,
        loading,
        weekStart,
        addGoal,
        completeGoal,
        deleteGoal,
        refresh,
        realtimeStatus,
      }}
    >
      {children}
    </GoalContext.Provider>
  );
}

export function useGoals(): GoalContextValue {
  const ctx = useContext(GoalContext);
  if (!ctx) throw new Error('useGoals must be used within GoalProvider');
  return ctx;
}
