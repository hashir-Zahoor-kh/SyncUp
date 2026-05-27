-- Phase 6A: Expand reactions emoji constraint from 3 to 6 emojis
-- and enable Realtime publication so clients receive live reaction events.

ALTER TABLE public.reactions
  DROP CONSTRAINT IF EXISTS reactions_emoji_check;

ALTER TABLE public.reactions
  ADD CONSTRAINT reactions_emoji_check
  CHECK (emoji IN ('🔥', '👏', '💛', '💪', '🎉', '❤️'));

-- Required for RLS-filtered Realtime events (old row data needed for DELETE events)
ALTER TABLE public.reactions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reactions;
