import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { Bot, Globe, Users, UserPlus } from "lucide-react";
import type { Level } from "@/lib/engine";
import { Piece } from "@/components/Piece";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mr B Chess – Schack i trä" },
      { name: "description", content: "Spela schack på ett vackert träbräde mot datorn eller mot en vän." },
      { property: "og:title", content: "Mr B Chess – Schack i trä" },
      { property: "og:description", content: "Spela schack på ett vackert träbräde mot datorn eller mot en vän." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

function Home() {
  const [level, setLevel] = useState<Level>("medium");
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 py-10">
      <motion.div
        className="flex w-full max-w-sm flex-col items-center gap-8"
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } }}
      >
        <motion.div variants={item} className="text-center">
          <motion.div
            className="mx-auto mb-3 size-32 drop-shadow-2xl"
            animate={{ rotate: [0, 0, 5, -4, 0], y: [0, 0, -6, 0, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 2.5 }}
          >
            <Piece color="w" type="k" className="size-full" />
          </motion.div>
          <h1 className="brand-wordmark text-5xl">Mr B Chess</h1>
          <p className="brand-tagline mt-2">Handgjort schack</p>
        </motion.div>

        <motion.div variants={item} className="w-full space-y-3">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">Datorns nivå</p>
          <div className="seg">
            {(["easy", "medium", "hard"] as Level[]).map((l) => (
              <button key={l} data-active={level === l} onClick={() => setLevel(l)}>
                {{ easy: "Lätt", medium: "Medel", hard: "Svår" }[l]}
              </button>
            ))}
          </div>
          <Link to="/play" search={{ mode: "ai", level }} className="action-btn action-gold">
            <Bot className="size-5" /> Spela mot datorn
          </Link>
        </motion.div>

        <motion.div variants={item} className="w-full space-y-3">
          <Link to="/play" search={{ mode: "local", level }} className="action-btn action-blue">
            <Users className="size-5" /> Två spelare, en enhet
          </Link>
          <button disabled className="action-btn action-ghost">
            <Globe className="size-5" /> Spela online <span className="chip-gold rounded-full px-2 py-0.5 text-[10px]">SNART</span>
          </button>
          <button disabled className="action-btn action-ghost">
            <UserPlus className="size-5" /> Vänner & inbjudningar <span className="chip-gold rounded-full px-2 py-0.5 text-[10px]">SNART</span>
          </button>
        </motion.div>
      </motion.div>
    </main>
  );
}
