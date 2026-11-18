CREATE TABLE public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  secret_hash text NOT NULL,
  player_number bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  name text,
  avatar text NOT NULL DEFAULT '♞',
  country text,
  friend_code text NOT NULL UNIQUE,
  last_seen timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX players_name_unique ON public.players (lower(name)) WHERE name IS NOT NULL;
GRANT ALL ON public.players TO service_role;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  addressee uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (requester <> addressee)
);
CREATE UNIQUE INDEX friendships_pair ON public.friendships (least(requester, addressee), greatest(requester, addressee));
GRANT ALL ON public.friendships TO service_role;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  white uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  black uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  result text NOT NULL CHECK (result IN ('w','b','d')),
  finished_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX matches_white ON public.matches (white);
CREATE INDEX matches_black ON public.matches (black);
GRANT ALL ON public.matches TO service_role;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;