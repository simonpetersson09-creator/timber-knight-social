import { describe, expect, it } from "vitest";
import { KEYS, LANGUAGES } from "./keys";
import { EUROPE } from "./locales-europe";
import { ASIA } from "./locales-asia";
import { translate } from "./translate";

const ALL = { ...EUROPE, ...ASIA };
const QUICK_PLAY: Record<string, string> = {
  sv: "Snabbspel", en: "Quick play", es: "Partida rápida", fr: "Partie rapide", it: "Partita rapida",
  de: "Schnelles Spiel", fi: "Pikapeli", no: "Hurtigspill", da: "Hurtigspil", nl: "Snel spelen",
  "pt-BR": "Jogo rápido", "pt-PT": "Jogo rápido", pl: "Szybka gra", tr: "Hızlı oyun", ru: "Быстрая игра",
  uk: "Швидка гра", cs: "Rychlá hra", sk: "Rýchla hra", sl: "Hitra igra", hr: "Brza igra",
  hu: "Gyors játék", ro: "Joc rapid", el: "Γρήγορο παιχνίδι", ca: "Partida ràpida", id: "Main cepat",
  ms: "Main pantas", vi: "Chơi nhanh", ja: "クイックプレイ", ko: "빠른 대국", th: "เล่นด่วน",
  hi: "तुरंत खेलें", bn: "দ্রুত খেলুন", gu: "ઝડપથી રમો", kn: "ತ್ವರಿತ ಆಟ", ml: "വേഗത്തിൽ കളിക്കൂ",
  mr: "झटपट खेळा", or: "ଶୀଘ୍ର ଖେଳନ୍ତୁ", pa: "ਝਟਪਟ ਖੇਡੋ", ta: "விரைவு ஆட்டம்", te: "త్వరిత ఆట",
};

describe("quick-play translations", () => {
  it("covers every supported language with the actual online-search label", () => {
    expect(Object.keys(QUICK_PLAY).sort()).toEqual(LANGUAGES.map(({ code }) => code).sort());
    for (const { code } of LANGUAGES) {
      const expected = QUICK_PLAY[code];
      expect(expected).toBeDefined();
      expect(ALL[code]?.[KEYS.indexOf("playComputer")]).toBe(expected);
      expect(translate(code, "playComputer")).toBe(expected);
    }
  });

  it.each(LANGUAGES.map(({ code }) => code))("%s explains the computer fallback in its own language", (code) => {
    const hint = ALL[code]?.[KEYS.indexOf("searchHint")];
    expect(hint).toBe(translate(code, "searchHint"));
    expect(hint?.length).toBeGreaterThan(10);
    if (code !== "en") expect(hint).not.toBe("If no one is found, you play the computer");
  });
});
