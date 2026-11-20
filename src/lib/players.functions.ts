import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { cleanName, friendCode } from "./profile";
import { Cred, PLAYER_COLS as COLS, allMatches, auth, db, enforceAbuseLimit, requestSubject, sha256 as hash, stockholmDay } from "./server/core";

export const registerPlayer = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Cred.extend({
    platform: z.enum(["ios", "android", "web"]).default("web"), tz: z.string().max(60).nullable().default(null), lang: z.string().max(8).default("en"), country: z.string().length(2).nullable().default(null),
  }).parse(d))
  .handler(async ({ data }) => {
    await enforceAbuseLimit("register", requestSubject(data.id));
    const a = await db();
    const { data: existing } = await a.from("players").select("id").eq("id", data.id).maybeSingle();
    if (!existing) {
      const { error } = await a.from("players").insert({ id: data.id, secret_hash: await hash(data.secret), friend_code: friendCode() });
      if (error) throw new Error(error.message);
    }
    const { a: a2, me } = await auth(data);
    await a2.from("players").update({ platform: data.platform, tz: data.tz, lang: data.lang }).eq("id", me);
    if (data.country) await a2.from("players").update({ country: data.country }).eq("id", me).is("country", null);
    if (data.platform !== "web") await a2.from("app_days").upsert({ player: me, day: stockholmDay(), platform: data.platform }, { onConflict: "player,day" });
    const { data: p } = await a2.from("players").select(`${COLS}, notify, notify_turn, notify_reminders, notify_play`).eq("id", me).single();
    if (!p) throw new Error("profile_read_failed");
    return p;
  });

export const updateProfile = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Cred.extend({ name: z.string().max(60), avatar: z.string().max(100).optional(), country: z.string().length(2).nullable() }).parse(d))
  .handler(async ({ data }) => {
    const { a, me } = await auth(data);
    let name: string | null;
    try { name = cleanName(data.name); } catch (e) { return { error: (e instanceof Error && e.message === "taken" ? "taken" : "too_long") as "taken" | "too_long" }; }
    const { error } = await a.from("players").update({ name, ...(data.avatar && !data.avatar.startsWith("photo:") ? { avatar: data.avatar } : {}), country: data.country }).eq("id", me);
    if (error) return { error: error.code === "23505" ? ("taken" as const) : ("failed" as const) };
    return { error: null };
  });

export const setPush = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Cred.extend({ token: z.string().max(4096).nullable().optional(), notify: z.boolean().optional(), notify_turn: z.boolean().optional(), notify_reminders: z.boolean().optional(), notify_play: z.boolean().optional() }).parse(d))
  .handler(async ({ data }) => {
    const { a, me } = await auth(data);
    const patch: { push_token?: string | null; notify?: boolean; notify_turn?: boolean; notify_reminders?: boolean; notify_play?: boolean } = {};
    if (data.token !== undefined) patch.push_token = data.token;
    if (data.notify !== undefined) patch.notify = data.notify;
    for (const key of ["notify_turn", "notify_reminders", "notify_play"] as const) if (data[key] !== undefined) patch[key] = data[key];
    await a.from("players").update(patch).eq("id", me);
    return { ok: true };
  });

/** "Radera mina data": removes the player and everything tied to it. */
export const deleteMyData = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Cred.parse(d))
  .handler(async ({ data }) => {
    const { a, me } = await auth(data);
    const { data: photos } = await a.storage.from("profile-photos").list(me);
    if (photos?.length) await a.storage.from("profile-photos").remove(photos.map((p) => `${me}/${p.name}`));
    await a.from("players").delete().eq("id", me);
    return { ok: true };
  });

export const reportEvent = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Cred.extend({ eventId: z.string().uuid(), kind: z.enum(["error", "ad", "play"]), name: z.string().max(80), detail: z.string().max(2000).nullable() }).parse(d))
  .handler(async ({ data }) => {
    const { a, me } = await auth(data);
    const { data: ok, error } = await a.rpc("ingest_chess_event", { p_player: me, p_event: data.eventId, p_kind: data.kind, p_name: data.name, p_detail: data.detail ?? "" });
    if (error) throw new Error("event_delivery_failed");
    return { ok: !!ok };
  });

export const getFriends = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Cred.parse(d))
  .handler(async ({ data }) => {
    const { a, me } = await auth(data);
    const { data: rows } = await a.from("friendships").select("id, requester, addressee, status, created_at").or(`requester.eq.${me},addressee.eq.${me}`);
    const list = rows ?? [];
    const otherIds = list.map((r) => (r.requester === me ? r.addressee : r.requester));
    const { data: players } = otherIds.length ? await a.from("players").select(COLS).in("id", otherIds) : { data: [] };
    const games = otherIds.length ? await allMatches(a, me) : [];
    return list.map((r) => {
      const otherId = r.requester === me ? r.addressee : r.requester;
      const vs = games.filter((g) => g.white === otherId || g.black === otherId);
      const mine = (g: { white: string; result: string }) => (g.result === "d" ? "d" : (g.result === "w") === (g.white === me) ? "w" : "l");
      return {
        id: r.id,
        kind: r.status === "accepted" ? ("friend" as const) : r.requester === me ? ("outgoing" as const) : ("incoming" as const),
        player: (players ?? []).find((p) => p.id === otherId),
        stats: { w: vs.filter((g) => mine(g) === "w").length, l: vs.filter((g) => mine(g) === "l").length, d: vs.filter((g) => mine(g) === "d").length },
        recent: vs.slice(0, 5).map((g) => ({ r: mine(g), at: g.finished_at })),
      };
    }).filter((x): x is typeof x & { player: NonNullable<typeof x.player> } => !!x.player);
  });

export const sendFriendRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Cred.extend({ code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{6}$/) }).parse(d))
  .handler(async ({ data }) => {
    const { a, me } = await auth(data);
    await enforceAbuseLimit("friend_requests", requestSubject(me));
    const { data: other } = await a.from("players").select("id").eq("friend_code", data.code).maybeSingle();
    if (!other) return { result: "not_found" as const };
    if (other.id === me) return { result: "self" as const };
    const { data: ex } = await a.from("friendships").select("id, requester, status").or(`and(requester.eq.${me},addressee.eq.${other.id}),and(requester.eq.${other.id},addressee.eq.${me})`).maybeSingle();
    if (ex) {
      if (ex.status === "pending" && ex.requester === other.id) { await a.from("friendships").update({ status: "accepted" }).eq("id", ex.id); return { result: "accepted" as const }; }
      return { result: ex.status === "accepted" ? ("already" as const) : ("sent" as const) };
    }
    const { error } = await a.from("friendships").insert({ requester: me, addressee: other.id });
    if (error) {
      if (error.code === "23505") return { result: "sent" as const };
      throw new Error("friend_request_failed");
    }
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

/** The private bucket never accepts direct client writes. */
export const saveProfilePhoto = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Cred.extend({ jpeg: z.string().max(680000).nullable() }).parse(d))
  .handler(async ({ data }) => {
    const { a, me } = await auth(data);
    await enforceAbuseLimit("photo_uploads", requestSubject(me));
    const path = `${me}/avatar.jpg`;
    if (data.jpeg === null) {
      await a.storage.from("profile-photos").remove([path]);
      await a.from("players").update({ avatar: "♞" }).eq("id", me);
      return { avatar: "♞" };
    }
    const bytes = Uint8Array.from(atob(data.jpeg), (c) => c.charCodeAt(0));
    if (bytes.length > 500000 || bytes[0] !== 255 || bytes[1] !== 216 || bytes[2] !== 255) throw new Error("invalid_photo");
    const { error } = await a.storage.from("profile-photos").upload(path, bytes, { contentType: "image/jpeg", upsert: true });
    if (error) throw new Error("photo_upload_failed");
    const avatar = `photo:${me}`;
    const { error: updateError } = await a.from("players").update({ avatar }).eq("id", me);
    if (updateError) throw new Error("photo_save_failed");
    return { avatar };
  });

export const getProfilePhoto = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Cred.extend({ player: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { a } = await auth(data);
    const { data: signed, error } = await a.storage.from("profile-photos").createSignedUrl(`${data.player}/avatar.jpg`, 3600);
    if (error || !signed) return { url: null };
    const url = new URL(signed.signedUrl);
    return { url: `${import.meta.env['VITE_SUPABASE_URL']}${url.pathname}${url.search}` };
  });
