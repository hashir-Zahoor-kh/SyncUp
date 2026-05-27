import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useGoals } from './GoalContext';
import type { Database } from '../types/database';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { type ReactionEmoji } from '../schemas/reaction';

export type { ReactionEmoji } from '../schemas/reaction';

type ReactionRow = Database['public']['Tables']['reactions']['Row'];

interface ReactionContextValue {
  reactions: ReactionRow[];
  addReaction: (goalId: string, emoji: ReactionEmoji) => Promise<void>;
  removeReaction: (goalId: string) => Promise<void>;
  getReactionsForGoal: (goalId: string) => ReactionRow[];
  getMyReaction: (goalId: string) => ReactionRow | undefined;
}

const ReactionContext = createContext<ReactionContextValue | null>(null);

export function ReactionProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { user } = useAuth();
  const { connection, goals, partnerGoals } = useGoals();
  const [reactions, setReactions] = useState<ReactionRow[]>([]);

  const loadReactions = useCallback(async (): Promise<void> => {
    if (!connection || !user) return;
    const ids = [...goals, ...partnerGoals].map((g) => g.id);
    if (ids.length === 0) {
      setReactions([]);
      return;
    }
    const { data } = await supabase.from('reactions').select('*').in('goal_id', ids);
    setReactions(data ?? []);
  }, [connection, user, goals, partnerGoals]);

  useEffect(() => {
    void loadReactions();
  }, [loadReactions]);

  useEffect(() => {
    if (!connection?.id) return;

    const channel = supabase
      .channel(`reactions:${connection.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reactions' },
        (payload: RealtimePostgresChangesPayload<ReactionRow>) => {
          if (payload.eventType === 'INSERT') {
            const newReaction = payload.new;
            setReactions((prev) => {
              if (prev.find((r) => r.id === newReaction.id)) return prev;
              return [...prev, newReaction];
            });
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            if (deletedId) setReactions((prev) => prev.filter((r) => r.id !== deletedId));
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [connection?.id]);

  const addReaction = useCallback(
    async (goalId: string, emoji: ReactionEmoji): Promise<void> => {
      if (!user) return;

      // Exclude optimistic rows when finding an existing DB reaction to replace
      const existing = reactions.find(
        (r) =>
          r.goal_id === goalId && r.from_user_id === user.id && !r.id.startsWith('optimistic-'),
      );
      const optimisticId = `optimistic-${Date.now()}`;

      // Optimistic: swap any existing reaction for the new emoji immediately
      setReactions((prev) => [
        ...prev.filter((r) => !(r.goal_id === goalId && r.from_user_id === user.id)),
        {
          id: optimisticId,
          goal_id: goalId,
          from_user_id: user.id,
          emoji,
          created_at: new Date().toISOString(),
        },
      ]);

      // No UPDATE policy on reactions — delete then insert to replace
      if (existing) {
        await supabase.from('reactions').delete().eq('id', existing.id).eq('from_user_id', user.id);
      }

      const { data: inserted, error } = await supabase
        .from('reactions')
        .insert({ goal_id: goalId, from_user_id: user.id, emoji })
        .select()
        .single();

      if (error) {
        setReactions((prev) => {
          const filtered = prev.filter((r) => r.id !== optimisticId);
          return existing ? [...filtered, existing] : filtered;
        });
        return;
      }

      if (inserted) {
        setReactions((prev) =>
          prev.map((r) => (r.id === optimisticId ? (inserted as ReactionRow) : r)),
        );
      }
    },
    [user, reactions],
  );

  const removeReaction = useCallback(
    async (goalId: string): Promise<void> => {
      if (!user) return;
      const existing = reactions.find((r) => r.goal_id === goalId && r.from_user_id === user.id);
      if (!existing) return;

      setReactions((prev) => prev.filter((r) => r.id !== existing.id));

      const { error } = await supabase
        .from('reactions')
        .delete()
        .eq('goal_id', goalId)
        .eq('from_user_id', user.id);

      if (error) setReactions((prev) => [...prev, existing]);
    },
    [user, reactions],
  );

  const getReactionsForGoal = useCallback(
    (goalId: string): ReactionRow[] => reactions.filter((r) => r.goal_id === goalId),
    [reactions],
  );

  const getMyReaction = useCallback(
    (goalId: string): ReactionRow | undefined =>
      reactions.find((r) => r.goal_id === goalId && r.from_user_id === user?.id),
    [reactions, user],
  );

  return (
    <ReactionContext.Provider
      value={{ reactions, addReaction, removeReaction, getReactionsForGoal, getMyReaction }}
    >
      {children}
    </ReactionContext.Provider>
  );
}

export function useReactions(): ReactionContextValue {
  const ctx = useContext(ReactionContext);
  if (!ctx) throw new Error('useReactions must be used within ReactionProvider');
  return ctx;
}
