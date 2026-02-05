"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

/* ===========================
   TYPES
=========================== */

type Tone = "calm" | "bold" | "motivational" | "direct";

type IdeaCard = {
  id: string;
  tone: Tone;
  text: string;
  why: string;
};

/* ===========================
   HELPERS
=========================== */

function normalizeKey(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** ✅ Copy ultra fiable (HTTPS / iPhone / fallback) */
async function copyToClipboard(text: string) {
  // 1) API moderne
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // ignore
  }

  // 2) Fallback textarea
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);

    ta.select();
    ta.setSelectionRange(0, ta.value.length); // iOS

    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/* ===========================
   IDEAS + WHY
=========================== */

function ideaPool(tone: Tone): string[] {
  const pools: Record<Tone, string[]> = {
    calm: [
      "Less text. Calm visuals.",
      "Minimal words, maximum meaning.",
      "Quiet posts can be powerful.",
      "Keep it simple today.",
      "One clear idea. One short sentence.",
      "Soft tone, strong message.",
      "Consistency beats intensity.",
    ],
    bold: [
      "Say one strong thing. Say it clearly.",
      "Stop overthinking. Post it.",
      "Short. Direct. No excuses.",
      "Clarity wins attention.",
      "Post the take. Own it.",
      "One message. One post. Go.",
      "Aesthetic second. Truth first.",
    ],
    motivational: [
      "Show up today. Momentum comes later.",
      "Progress beats perfection.",
      "One post can change your week.",
      "Small steps build big results.",
      "Post today. Thank yourself tomorrow.",
      "Do it before you feel ready.",
      "Consistency builds confidence.",
    ],
    direct: [
      "Clarity first. Aesthetic second.",
      "Say it simply. Ship it.",
      "One message. One post. Go.",
      "Cut the fluff. Keep the point.",
      "Make it obvious. Make it fast.",
      "Less explaining. More posting.",
      "Strong idea. Clean execution.",
    ],
  };

  return pools[tone] ?? pools.calm;
}

function pickWhy(tone: Tone, topicRaw: string) {
  const topic = topicRaw.trim();
  const base: Record<Tone, string> = {
    calm: "Calm posts are easier to read, so people save them more.",
    bold: "Bold clarity stops the scroll and gets reactions fast.",
    motivational: "Short encouragement feels relatable and shareable.",
    direct: "Direct language is understood instantly on mobile.",
  };

  if (!topic) return base[tone];

  return `${base[tone]} It fits the topic “${topic}” without over-explaining.`;
}

/* ===========================
   LOCAL STORAGE (Saved ideas)
=========================== */

function loadSavedFromStorage(): IdeaCard[] {
  try {
    const raw = localStorage.getItem("savedIdeas_v2");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x) => x && typeof x.text === "string" && typeof x.tone === "string")
      .map((x) => ({
        id: typeof x.id === "string" ? x.id : makeId(),
        tone: x.tone as Tone,
        text: x.text,
        why: typeof x.why === "string" ? x.why : "",
      }));
  } catch {
    return [];
  }
}

function saveToStorage(items: IdeaCard[]) {
  try {
    localStorage.setItem("savedIdeas_v2", JSON.stringify(items));
  } catch {
    // ignore
  }
}

/* ===========================
   PAGE (single file, no Suspense error)
=========================== */

/**
 * ✅ IMPORTANT:
 * On NE FAIT PAS useSearchParams().
 * On récupère u/topic depuis l'URL via window.location dans un useEffect,
 * donc aucun "Suspense" nécessaire et Vercel build OK.
 */
export default function ResultsPage() {
  const [username, setUsername] = useState("user");
  const [topic, setTopic] = useState("");

  const [tone, setTone] = useState<Tone>("calm");
  const [ideas, setIdeas] = useState<IdeaCard[]>([]);

  const [savedIdeas, setSavedIdeas] = useState<IdeaCard[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copyTimers = useRef<Record<string, any>>({});

  const [whyOpen, setWhyOpen] = useState<Record<string, boolean>>({});
  const [savedFlash, setSavedFlash] = useState<Record<string, boolean>>({});
  const flashTimers = useRef<Record<string, any>>({});

  /* ---- read URL params (client) ---- */
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      setUsername(sp.get("u") || "user");
      setTopic(sp.get("topic") || "");
    } catch {
      // ignore
    }
  }, []);

  /* ---- load saved on mount ---- */
  useEffect(() => {
    const saved = loadSavedFromStorage();
    // uniq by text
    const seen = new Set<string>();
    const clean: IdeaCard[] = [];
    for (const it of saved) {
      const k = normalizeKey(it.text);
      if (seen.has(k)) continue;
      seen.add(k);
      clean.push(it);
    }
    setSavedIdeas(clean);
    setHydrated(true);
  }, []);

  /* ---- persist saved ---- */
  useEffect(() => {
    if (!hydrated) return;
    saveToStorage(savedIdeas);
  }, [savedIdeas, hydrated]);

  const savedKeySet = useMemo(() => {
    return new Set(savedIdeas.map((x) => normalizeKey(x.text)));
  }, [savedIdeas]);

  /* ---- generate 3 UNIQUE ideas (no duplicates) ---- */
  useEffect(() => {
    if (!hydrated) return;

    // On exclut d’abord les saved
    const pool = ideaPool(tone).filter((t) => !savedKeySet.has(normalizeKey(t)));

    // si pool trop petit, on reprend tout
    const base = pool.length >= 3 ? pool : ideaPool(tone);

    // SHUFFLE 1 fois -> on prend les 3 premières => plus de doublons
    const picked = shuffle(base).slice(0, 3);

    const out: IdeaCard[] = picked.map((text) => ({
      id: makeId(),
      tone,
      text,
      why: pickWhy(tone, topic),
    }));

    setIdeas(out);
    setWhyOpen({});
    setSavedFlash({});
  }, [tone, topic, hydrated, savedKeySet]);

  /* ---- cleanup timers ---- */
  useEffect(() => {
    return () => {
      Object.values(copyTimers.current).forEach((t) => clearTimeout(t));
      Object.values(flashTimers.current).forEach((t) => clearTimeout(t));
      copyTimers.current = {};
      flashTimers.current = {};
    };
  }, []);

  async function onCopy(text: string, key: string) {
    const ok = await copyToClipboard(text);
    if (!ok) {
      alert("Copy bloqué. Essaie sur HTTPS ou fais un copier manuellement.");
      return;
    }
    setCopiedKey(key);
    if (copyTimers.current[key]) clearTimeout(copyTimers.current[key]);
    copyTimers.current[key] = setTimeout(() => setCopiedKey(null), 1200);
  }

  function toggleWhy(id: string) {
    setWhyOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function flashSaved(id: string) {
    setSavedFlash((prev) => ({ ...prev, [id]: true }));
    if (flashTimers.current[id]) clearTimeout(flashTimers.current[id]);
    flashTimers.current[id] = setTimeout(() => {
      setSavedFlash((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }, 1200);
  }

  function isIdeaSaved(text: string) {
    return savedKeySet.has(normalizeKey(text));
  }

  function onSave(idea: IdeaCard) {
    const key = normalizeKey(idea.text);
    if (savedKeySet.has(key)) return;
    setSavedIdeas((prev) => [idea, ...prev]);
    flashSaved(idea.id);
  }

  function onRemoveSaved(text: string) {
    const key = normalizeKey(text);
    setSavedIdeas((prev) => prev.filter((x) => normalizeKey(x.text) !== key));
  }

  function onClearSaved() {
    setSavedIdeas([]);
  }

  function regenerateOne(index: number) {
    setIdeas((prev) => {
      const current = [...prev];

      // interdit: saved + les 2 autres idées
      const banned = new Set<string>(savedKeySet);
      current.forEach((it, i) => {
        if (i !== index) banned.add(normalizeKey(it.text));
      });

      const candidates = ideaPool(tone).filter((t) => !banned.has(normalizeKey(t)));
      const base = candidates.length ? candidates : ideaPool(tone);
      const newText = shuffle(base)[0];

      current[index] = {
        id: makeId(),
        tone,
        text: newText,
        why: pickWhy(tone, topic),
      };
      return current;
    });
  }

  function regenerateAll() {
    const pool = ideaPool(tone).filter((t) => !savedKeySet.has(normalizeKey(t)));
    const base = pool.length >= 3 ? pool : ideaPool(tone);
    const picked = shuffle(base).slice(0, 3);

    setIdeas(
      picked.map((text) => ({
        id: makeId(),
        tone,
        text,
        why: pickWhy(tone, topic),
      }))
    );
    setWhyOpen({});
    setSavedFlash({});
  }

  async function copyAll() {
    const text = ideas.map((x) => `• ${x.text}`).join("\n");
    await onCopy(text, "copy-all");
  }

  const toneLabel: Record<Tone, string> = {
    calm: "Soft, minimal, clean vibe.",
    bold: "Clear, confident, punchy.",
    motivational: "Supportive, energizing, uplifting.",
    direct: "Direct, no-fluff, straight to the point.",
  };

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "28px 18px", fontFamily: "system-ui, -apple-system" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <a href="/" style={{ color: "#111", textDecoration: "none", fontWeight: 600 }}>
          ← Back
        </a>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={copyAll}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #111",
              background: "#111",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {copiedKey === "copy-all" ? "Copied ✅" : "Copy all (3 ideas)"}
          </button>

          <button
            onClick={regenerateAll}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #cfcfcf",
              background: "#fff",
              color: "#111",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Regenerate all
          </button>
        </div>
      </div>

      <h1 style={{ fontSize: 44, margin: "0 0 6px 0", letterSpacing: -0.5 }}>Results</h1>
      <div style={{ color: "#555", marginBottom: 16 }}>
        Choose a tone, copy an idea, or regenerate if you want something different.
      </div>

      <div style={{ marginBottom: 18 }}>
        <div style={{ fontWeight: 800, marginBottom: 4 }}>Analysis for @{username}</div>
        <div style={{ color: "#666", marginBottom: 10 }}>
          {toneLabel[tone]}
          {topic ? (
            <>
              {" "}
              · Topic: <b>{topic}</b>
            </>
          ) : null}
        </div>

        {/* Tone Pills */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {(["calm", "bold", "motivational", "direct"] as Tone[]).map((t) => {
            const active = tone === t;
            return (
              <button
                key={t}
                onClick={() => setTone(t)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 999,
                  border: "1px solid #cfcfcf",
                  background: active ? "#111" : "#fff",
                  color: active ? "#fff" : "#111",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {/* Ideas */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18, marginBottom: 10 }}>
        <div style={{ fontSize: 26, fontWeight: 900 }}>✨ 3 post ideas you can use today</div>
      </div>

      <div style={{ color: "#666", marginBottom: 16 }}>
        Tip: copy one, post it as-is, and keep the visual calm.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {ideas.map((idea, idx) => {
          const saved = isIdeaSaved(idea.text);
          const showFlash = !!savedFlash[idea.id];
          const copyKey = `copy-${idea.id}`;

          return (
            <div
              key={idea.id}
              style={{
                border: "1px solid #e6e6e6",
                borderRadius: 16,
                padding: 16,
                background: "#fff",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 12, color: "#777", fontWeight: 700, marginBottom: 6 }}>
                    Idea {idx + 1}/3
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 900 }}>{idea.text}</div>
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => onCopy(idea.text, copyKey)}
                    style={{
                      padding: "9px 12px",
                      borderRadius: 12,
                      border: "1px solid #111",
                      background: "#111",
                      color: "#fff",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    {copiedKey === copyKey ? "Copied ✅" : "Copy"}
                  </button>

                  <button
                    onClick={() => regenerateOne(idx)}
                    style={{
                      padding: "9px 12px",
                      borderRadius: 12,
                      border: "1px solid #cfcfcf",
                      background: "#fff",
                      color: "#111",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    Regenerate ↻
                  </button>

                  <button
                    onClick={() => onSave(idea)}
                    disabled={saved}
                    style={{
                      padding: "9px 12px",
                      borderRadius: 12,
                      border: "1px solid #cfcfcf",
                      background: saved ? "#f2f2f2" : "#fff",
                      color: saved ? "#999" : "#111",
                      fontWeight: 800,
                      cursor: saved ? "not-allowed" : "pointer",
                    }}
                  >
                    {saved ? "Saved ★" : "Save ☆"}
                  </button>

                  {showFlash && <div style={{ fontWeight: 900, color: "#111" }}>Saved ⭐</div>}

                  <button
                    onClick={() => toggleWhy(idea.id)}
                    style={{
                      padding: "9px 12px",
                      borderRadius: 12,
                      border: "1px solid #e0e0e0",
                      background: "#fff",
                      color: "#111",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    Why?
                  </button>
                </div>
              </div>

              {whyOpen[idea.id] && (
                <div
                  style={{
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 14,
                    background: "#fafafa",
                    border: "1px solid #eee",
                    color: "#333",
                    lineHeight: 1.35,
                  }}
                >
                  <div style={{ fontWeight: 900, marginBottom: 4 }}>Why it works</div>
                  <div style={{ color: "#555" }}>{idea.why}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Saved Ideas */}
      <div style={{ marginTop: 26 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 20, fontWeight: 900 }}>⭐ Saved ideas</div>

          {savedIdeas.length > 0 && (
            <button
              onClick={onClearSaved}
              style={{
                padding: "8px 12px",
                borderRadius: 12,
                border: "1px solid #cfcfcf",
                background: "#fff",
                color: "#111",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Clear
            </button>
          )}
        </div>

        <div style={{ color: "#777", marginTop: 6, marginBottom: 12 }}>Your personal idea library.</div>

        {savedIdeas.length === 0 ? (
          <div style={{ color: "#777", padding: "12px 0" }}>No saved ideas yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {savedIdeas.map((it) => {
              const key = `copy-saved-${normalizeKey(it.text)}`;
              return (
                <div
                  key={normalizeKey(it.text)}
                  style={{
                    border: "1px solid #eee",
                    borderRadius: 16,
                    padding: 14,
                    background: "#fff",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div style={{ fontWeight: 800 }}>{it.text}</div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                      onClick={() => onCopy(it.text, key)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 12,
                        border: "1px solid #111",
                        background: "#111",
                        color: "#fff",
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      {copiedKey === key ? "Copied ✅" : "Copy"}
                    </button>
                    <button
                      onClick={() => onRemoveSaved(it.text)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 12,
                        border: "1px solid #cfcfcf",
                        background: "#fff",
                        color: "#111",
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ marginTop: 18, color: "#999", fontSize: 12 }}>(If you don't see changes: hard refresh the page.)</div>
    </div>
  );
}