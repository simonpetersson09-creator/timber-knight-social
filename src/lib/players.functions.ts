import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { cleanName, friendCode } from "./profile";
import { Cred, PLAYER_COLS as COLS, auth, db, sha256 as hash } from "./server/core";

export const registerPlayer = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Cred.extend({
    platform: z.enum(["ios", "android", "web"]).default("web"), tz: z.string().max(60).nullable().default(null), lang: z.string().max(8).default("en"),
  }).parse(d))
  .handler(async ({ data }) => {
    const a = await db();
    const { data: existing } = await a.from("players").select("id").eq("id", data.id).maybeSingle();
    if (!existing) {
      const { error } = await a.from("players").insert({ id: data.id, secret_hash: await hash(data.secret), friend_code: friendCode() });
      if (error) throw new Error(error.message);
    }
    const { a: a2, me } = await auth(data);
    await a2.from("players").update({ platform: data.platform, tz: data.tz, lang: data.lang }).eq("id", me);
    await a2.from("app_days").upsert({ player: me, day: new Date().toISOString().slice(0, 10), platform: data.platform }, { onConflict: "player,day", ignoreDuplicates: true });
    const { data: p } = await a2.from("players").select(`${COLS}, notify`).eq("id", me).single();
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

export const setPush = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Cred.extend({ token: z.string().max(4096).nullable().optional(), notify: z.boolean().optional() }).parse(d))
  .handler(async ({ data }) => {
    const { a, me } = await auth(data);
    const patch: { push_token?: string | null; notify?: boolean } = {};
    if (data.token !== undefined) patch.push_token = data.token;
    if (data.notify !== undefined) patch.notify = data.notify;
    await a.from("players").update(patch).eq("id", me);
    return { ok: true };
  });

/** "Radera mina data": removes the player and everything tied to it. */
export const deleteMyData = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Cred.parse(d))
  .handler(async ({ data }) => {
    const { a, me } = await auth(data);
    await a.from("players").delete().eq("id", me);
    return { ok: true };
  });

export const reportEvent = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid().nullable(), platform: z.enum(["ios", "android", "web"]), kind: z.enum(["error", "ad"]), name: z.string().max(80), detail: z.string().max(2000).nullable() }).parse(d))
  .handler(async ({ data }) => {
    const a = await db();
    let player = data.id;
    if (player) { const { data: p } = await a.from("players").select("id").eq("id", player).maybeSingle(); if (!p) player = null; }
    await a.from("client_events").insert({ player, platform: data.platform, kind: data.kind, name: data.name, detail: data.detail });
    return { ok: true };
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
      ? await a.from("matches").select("white, black, result, finished_at, counts").or(`white.eq.${me},black.eq.${me}`).eq("counts", true).order("finished_at", { ascending: false }).limit(500)
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
    } else await a.from("friendships").delete().eq("id", f.id);
    return { ok: true };
  });
