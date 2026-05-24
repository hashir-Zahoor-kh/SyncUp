// Minimal Database type for use within Edge Functions (Deno runtime).
// Mirrors src/types/database.ts for the tables and functions used by Phase 4 Edge Functions.

export interface Database {
  public: {
    Tables: {
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
      rate_limit_events: {
        Row: {
          id: string;
          event_type: string;
          ip_address: string;
          created_at: string;
        };
        Insert: {
          id?: string | undefined;
          event_type: string;
          ip_address: string;
          created_at?: string | undefined;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      accept_invite_atomic: {
        Args: { p_token: string; p_accepter_user_id: string };
        Returns: {
          result: 'success' | 'invalid_token' | 'self_accept' | 'already_connected';
          connection_id: string | null;
          partner_name: string | null;
          partner_avatar_color: string | null;
        };
      };
    };
    Enums: Record<string, never>;
  };
}
