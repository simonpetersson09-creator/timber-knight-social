ALTER TABLE public.players ADD COLUMN platform text NOT NULL DEFAULT 'web';
ALTER TABLE public.players ADD COLUMN is_test boolean NOT NULL DEFAULT false;
ALTER TABLE public.players ADD COLUMN tz text;
ALTER TABLE public.players ADD COLUMN push_token text;
ALTER TABLE public.players ADD COLUMN notify boolean NOT NULL DEFAULT true;
ALTER TABLE public.players ADD COLUMN last_played timestamptz;
ALTER TABLE public.players ADD COLUMN last_reminder timestamptz;
ALTER TABLE public.matches ADD COLUMN counts boolean NOT NULL DEFAULT true;

CREATE TABLE public.games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('invite','lobby','quick')),
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','active','finished','expired')),
  host uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  invitee uuid REFERENCES public.players(id) ON DELETE CASCADE,
  white uuid REFERENCES public.players(id) ON DELETE CASCADE,
  black uuid REFERENCES public.players(id) ON DELETE CASCADE,
  code text UNIQUE,
  pgn text NOT NULL DEFAULT '',
  fen text NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  result text CHECK (result IN ('w','b','d')),
  end_reason text,
  draw_offer text,
  last_move_at timestamptz NOT NULL DEFAULT now(),
  reminded boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX games_white ON public.games (white);
CREATE INDEX games_black ON public.games (black);
CREATE INDEX games_invitee ON public.games (invitee);
CREATE INDEX games_status ON public.games (status, kind);
GRANT ALL ON public.games TO service_role;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.game_chat (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  player uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  phrase smallint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX game_chat_game ON public.game_chat (game_id, id);
GRANT ALL ON public.game_chat TO service_role;
ALTER TABLE public.game_chat ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.app_days (
  player uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  day date NOT NULL,
  platform text NOT NULL,
  PRIMARY KEY (player, day)
);
GRANT ALL ON public.app_days TO service_role;
ALTER TABLE public.app_days ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.client_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  player uuid REFERENCES public.players(id) ON DELETE SET NULL,
  platform text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('error','ad')),
  name text NOT NULL,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX client_events_time ON public.client_events (created_at DESC);
GRANT ALL ON public.client_events TO service_role;
ALTER TABLE public.client_events ENABLE ROW LEVEL SECURITY;