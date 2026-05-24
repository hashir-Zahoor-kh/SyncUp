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
          created_at?: string | undefined;
          updated_at?: string | undefined;
          is_pro?: boolean | undefined;
        };
        Update: {
          id?: string | undefined;
          display_name?: string | undefined;
          avatar_color?: string | undefined;
          updated_at?: string | undefined;
          is_pro?: boolean | undefined;
        };
        Relationships: [];
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
          id?: string | undefined;
          user_id: string;
          connection_id: string;
          text: string;
          tag: 'Health' | 'Focus' | 'Life' | 'Custom';
          completed_at?: string | null | undefined;
          week_start: string;
          created_at?: string | undefined;
        };
        Update: {
          text?: string | undefined;
          tag?: 'Health' | 'Focus' | 'Life' | 'Custom' | undefined;
          completed_at?: string | null | undefined;
        };
        Relationships: [];
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
          id?: string | undefined;
          user_a_id: string;
          user_b_id: string;
          relationship_type: 'Friends' | 'Partners' | 'Family' | 'Workout Buddy';
          created_at?: string | undefined;
        };
        Update: {
          relationship_type?: 'Friends' | 'Partners' | 'Family' | 'Workout Buddy' | undefined;
        };
        Relationships: [];
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
          id?: string | undefined;
          goal_id: string;
          from_user_id: string;
          emoji: string;
          created_at?: string | undefined;
        };
        Update: Record<string, never>;
        Relationships: [];
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
          id?: string | undefined;
          token: string;
          inviter_user_id: string;
          created_at?: string | undefined;
          expires_at: string;
          accepted?: boolean | undefined;
          accepted_by?: string | null | undefined;
        };
        Update: {
          accepted?: boolean | undefined;
          accepted_by?: string | null | undefined;
        };
        Relationships: [];
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
          id?: string | undefined;
          user_id: string;
          token: string;
          created_at?: string | undefined;
          updated_at?: string | undefined;
        };
        Update: {
          token?: string | undefined;
          updated_at?: string | undefined;
        };
        Relationships: [];
      };
      deletion_requests: {
        Row: {
          id: string;
          user_id: string;
          requested_at: string;
          processed_at: string | null;
        };
        Insert: {
          id?: string | undefined;
          user_id: string;
          requested_at?: string | undefined;
          processed_at?: string | null | undefined;
        };
        Update: {
          processed_at?: string | null | undefined;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
