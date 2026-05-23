export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_color: string;
          created_at: string;
          updated_at: string;
          is_pro: boolean;
        };
        Insert: {
          id: string;
          display_name: string;
          avatar_color: string;
          created_at?: string;
          updated_at?: string;
          is_pro?: boolean;
        };
        Update: {
          id?: string;
          display_name?: string;
          avatar_color?: string;
          updated_at?: string;
          is_pro?: boolean;
        };
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          connection_id: string;
          text: string;
          tag: 'Health' | 'Focus' | 'Life' | 'Custom';
          completed_at: string | null;
          week_start: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          connection_id: string;
          text: string;
          tag: 'Health' | 'Focus' | 'Life' | 'Custom';
          completed_at?: string | null;
          week_start: string;
          created_at?: string;
        };
        Update: {
          text?: string;
          tag?: 'Health' | 'Focus' | 'Life' | 'Custom';
          completed_at?: string | null;
        };
      };
      connections: {
        Row: {
          id: string;
          user_a_id: string;
          user_b_id: string;
          relationship_type: 'Friends' | 'Partners' | 'Family' | 'Workout Buddy';
          created_at: string;
        };
        Insert: {
          id?: string;
          user_a_id: string;
          user_b_id: string;
          relationship_type: 'Friends' | 'Partners' | 'Family' | 'Workout Buddy';
          created_at?: string;
        };
        Update: {
          relationship_type?: 'Friends' | 'Partners' | 'Family' | 'Workout Buddy';
        };
      };
      reactions: {
        Row: {
          id: string;
          goal_id: string;
          from_user_id: string;
          emoji: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          goal_id: string;
          from_user_id: string;
          emoji: string;
          created_at?: string;
        };
        Update: Record<string, never>;
      };
      invites: {
        Row: {
          id: string;
          token: string;
          inviter_user_id: string;
          created_at: string;
          expires_at: string;
          accepted: boolean;
          accepted_by: string | null;
        };
        Insert: {
          id?: string;
          token: string;
          inviter_user_id: string;
          created_at?: string;
          expires_at: string;
          accepted?: boolean;
          accepted_by?: string | null;
        };
        Update: {
          accepted?: boolean;
          accepted_by?: string | null;
        };
      };
      push_tokens: {
        Row: {
          id: string;
          user_id: string;
          token: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          token: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          token?: string;
          updated_at?: string;
        };
      };
      deletion_requests: {
        Row: {
          id: string;
          user_id: string;
          requested_at: string;
          processed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          requested_at?: string;
          processed_at?: string | null;
        };
        Update: {
          processed_at?: string | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
