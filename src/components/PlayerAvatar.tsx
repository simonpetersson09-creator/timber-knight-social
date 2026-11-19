import { useEffect, useState } from "react";
import { getProfilePhoto } from "@/lib/players.functions";
import { getCred } from "@/lib/identity";

export function PlayerAvatar({ avatar }: { avatar?: string | null | undefined }) {
  const [url, setUrl] = useState<string | null>(null);
  const player = avatar?.startsWith("photo:") ? avatar.slice(6) : null;
  useEffect(() => {
    setUrl(null);
    if (!player) return;
    let alive = true;
    void getProfilePhoto({ data: { ...getCred(), player } }).then((r) => { if (alive) setUrl(r.url); }).catch(() => {});
    return () => { alive = false; };
  }, [player]);
  return url ? <img src={url} alt="" className="size-full rounded-full object-cover" /> : <>{player ? "♞" : avatar ?? "♞"}</>;
}