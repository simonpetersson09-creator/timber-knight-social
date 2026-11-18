import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { cleanName, friendCode } from "./profile";

const Cred = z.object({ id: z.string().uuid(), secret: z.string().min(20).max(100) });
async function hash(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function db() { return (await import("@/integrations/supabase/client.server")).supabaseAdmin; }
const COLS = "id, player_number, name, avatar, country, friend_code, last_seen";

/** Verifies the device credentials, marks the player as seen and returns the player id. */
async function auth(c: z.infer<typeof Cred>) {
  const a = await db();
  const { data } = await a.from("players").select("id, secret_hash").eq("id", c.id).maybeSingle();
  if (!data || data.secret_hash !== (await hash(c.secret))) throw new Error("unauthorized");
  await a.from("players").update({ last_seen: new Date().toISOString() }).eq("id", c.id);
  return { a, me: c.id };
}

export const registerPlayer = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Cred.parse(d))
  .handler(async ({ data }) => {
    const a = await db();
    const { data: existing } = await a.from("players").select("id").eq("id", data.id).maybeSingle();
    if (!existing) {
      const { error } = await a.from("players").insert({ id: data.id, secret_hash: await hash(data.secret), friend_code: friendCode() });
      if (error) throw new Error(error.message);
    }
    const { a: a2, me } = await auth(data);
    const { data: p } = await a2.from("players").select(COLS).eq("id", me).single();
    return p!;
  });

export const updateProfile = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Cred.extend({ name: z.string().max(60), avatar: z.string().max(8), country: z.string().length(2).nullable() }).parse(d))
  .handler(async ({ data }) => {
    const { a, me } = await auth(data);
    let name: string | null;
    try { name = cleanName(data.name); } catch { return { error: "too_long" as const }; }
    const { error } = await a.from("players").update({ name, avatar: data.avatar, country: data.country }).eq("id", me);
    if (error) return { error: error.code === "23505" ? ("taken" as const) : ("failed" as const) };
    return { error: null };
  });

export const getFriends = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Cred.parse(d))
  .handler(async ({ data }) => {
    const { a, me } = await auth(data);
    const { data: rows } = await a.from("friendships").select("id, requester, addressee, status, created_at").or(`requester.eq.${me},addressee.eq.${me}`);
    const list = rows ?? [];
    const otherIds = list.map((r) => (r.requester === me ? r.addressee : r.requester));
    const { data: players } = otherIds.length ? await a.from("players").select(COLS).in("id", otherIds) : { data: [] };
    const { data: games } = otherIds.length
      ? await a.from("matches").select("white, black, result, finished_at").or(`white.eq.${me},black.eq.${me}`).order("finished_at", { ascending: false }).limit(500)
      : { data: [] };
    return list.map((r) => {
      const otherId = r.requester === me ? r.addressee : r.requester;
      const vs = (games ?? []).filter((g) => g.white === otherId || g.black === otherId);
      const mine = (g: { white: string; result: string }) => (g.result === "d" ? "d" : (g.result === "w") === (g.white === me) ? "w" : "l");
      return {
        id: r.id,
        kind: r.status === "accepted" ? ("friend" as const) : r.requester === me ? ("outgoing" as const) : ("incoming" as const),
        player: (players ?? []).find((p) => p.id === otherId)!,
        stats: { w: vs.filter((g) => mine(g) === "w").length, l: vs.filter((g) => mine(g) === "l").length, d: vs.filter((g) => mine(g) === "d").length },
        recent: vs.slice(0, 5).map((g) => ({ r: mine(g), at: g.finished_at })),
      };
    }).filter((x) => x.player);
  });

export const sendFriendRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Cred.extend({ code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{6}$/) }).parse(d))
  .handler(async ({ data }) => {
    const { a, me } = await auth(data);
    const { data: other } = await a.from("players").select("id").eq("friend_code", data.code).maybeSingle();
    if (!other) return { result: "not_found" as const };
    if (other.id === me) return { result: "self" as const };
    const { data: ex } = await a.from("friendships").select("id, requester, status").or(`and(requester.eq.${me},addressee.eq.${other.id}),and(requester.eq.${other.id},addressee.eq.${me})`).maybeSingle();
    if (ex) {
      // Crossed requests: the other player already asked us – accept it.
      if (ex.status === "pending" && ex.requester === other.id) { await a.from("friendships").update({ status: "accepted" }).eq("id", ex.id); return { result: "accepted" as const }; }
      return { result: ex.status === "accepted" ? ("already" as const) : ("sent" as const) };
    }
    await a.from("friendships").insert({ requester: me, addressee: other.id });
    return { result: "sent" as const };
  });

export const respondFriend = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Cred.extend({ fid: z.string().uuid(), action: z.enum(["accept", "remove"]) }).parse(d))
  .handler(async ({ data }) => {
    const { a, me } = await auth(data);
    const { data: f } = await a.from("friendships").select("id, requester, addressee").eq("id", data.fid).maybeSingle();
    if (!f || (f.requester !== me && f.addressee !== me)) throw new Error("not_found");
    if (data.action === "accept") {
      if (f.addressee !== me) throw new Error("forbidden");
      await a.from("friendships").update({ status: "accepted" }).eq("id", f.id);
    } else await a.from("friendships").delete().eq("id", f.id); // decline, withdraw or remove
    return { ok: true };
  });
