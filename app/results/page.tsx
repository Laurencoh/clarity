"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

type Tone = "calm" | "bold" | "motivational" | "direct";

type IdeaCard = {
  id: string;
  tone: Tone;
  text: string;
  why: string;
};

function normalizeKey(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function uniqBy<T>(items: T[], keyFn: (x: T) => string) {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of items) {
    const k = keyFn(it);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out;
}

function pickRandom<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** ✅ Copy ultra fiable (HTTPS / iPhone / fallback) */
async function copyToClipboard(text: string) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}

  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);

    ta.select();
    ta.setSelectionRange(0, ta.value.length);

    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** ✅ Idea pool */
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

/** ✅ TOPIC helpers */
function getTopicCategory(topicRaw: string) {
  const t = normalizeKey(topicRaw);
  const hasAny = (words: string[]) => words.some((w) => t.includes(w));

  if (hasAny(["study", "etude", "étude", "exams", "revision", "révision", "school", "uni", "homework"])) return "study";
  if (hasAny(["skincare", "skin", "peau", "routine", "acne", "acné", "beauty", "glow"])) return "skincare";
  if (hasAny(["fitness", "sport", "workout", "training", "gym", "muscu", "run"])) return "fitness";
  if (hasAny(["money", "finance", "invest", "investment", "bourse", "etf", "budget"])) return "finance";
  if (hasAny(["productivity", "productiv", "focus", "deep work", "habits", "discipline"])) return "productivity";
  if (hasAny(["business", "startup", "marketing", "sales", "brand", "content"])) return "business";

  return "generic";
}

/** ✅ Why pool – dépend de tone + topic */
function whyPool(tone: Tone, topicRaw: string): string[] {
  const cat = getTopicCategory(topicRaw);

  const base: Record<Tone, string[]> = {
    calm: [
      "Calm posts feel easier to read, which increases saves.",
      "Short, quiet ideas reduce cognitive load for the reader.",
      "Minimal wording helps your message stand out naturally.",
      "A calm tone builds trust and long-term consistency.",
    ],
    bold: [
      "Strong opinions stop the scroll immediately.",
      "Clear statements invite reactions and replies.",
      "Bold phrasing makes ideas easier to remember.",
      "Confidence creates attention without extra words.",
    ],
    motivational: [
      "People save posts that make them feel capable.",
      "Simple encouragement lowers pressure to act.",
      "Motivation works best when it’s short and relatable.",
      "Progress-focused ideas feel achievable and shareable.",
    ],
    direct: [
      "Clear ideas are understood instantly on mobile.",
      "One point per post increases retention.",
      "Direct language removes friction for the reader.",
      "Less explanation = faster engagement.",
    ],
  };

  const topicSpecific: Record<string, string[]> = {
    study: [
      "Study content performs when it’s actionable and easy to scan.",
      "Short advice reduces overwhelm and helps people actually apply it.",
      "Clear frameworks get saved for later revision.",
      "Focus + consistency is more credible than “perfect methods”.",
    ],
    skincare: [
      "Skincare posts get saved when they feel simple + repeatable.",
      "Short routines reduce confusion, so people keep them.",
      "Clear steps build trust more than long explanations.",
      "Consistency messaging fits skincare better than “miracle fixes”.",
    ],
    fitness: [
      "Fitness advice is saved when it’s simple enough to follow tomorrow.",
      "One clear cue beats a long program for engagement.",
      "People share workouts that feel achievable, not intimidating.",
      "Consistency framing reduces “all or nothing” thinking.",
    ],
    finance: [
      "Finance posts get shared when they feel clear and low-risk to try.",
      "Simple rules are saved more than complex strategies.",
      "Clarity builds trust fast in money topics.",
      "Actionable steps outperform long theory threads.",
    ],
    productivity: [
      "Productivity advice wins when it reduces friction immediately.",
      "Short systems are easier to adopt and keep.",
      "Clear focus prompts get saved for daily use.",
      "One habit is more believable than a full “life reset”.",
    ],
    business: [
      "Business content performs when it’s a clear lesson + a simple takeaway.",
      "Short, confident statements invite debate and replies.",
      "People save frameworks they can reuse in their own work.",
      "Clarity beats jargon for engagement.",
    ],
    generic: [
      "Specific and simple ideas feel more shareable.",
      "Short posts are easier to read, save, and repost.",
      "One point per post increases retention.",
      "Clarity makes people stop scrolling.",
    ],
  };

  const topicArr = topicSpecific[cat] ?? topicSpecific.generic;
  const baseArr = base[tone] ?? base.calm;

  return [...topicArr.slice(0, 4), ...baseArr.slice(0, 4)];
}

function pickWhy(tone: Tone, topicRaw: string) {
  return pickRandom(whyPool(tone, topicRaw));
}

/** ✅ Pick unique text */
function pickUniqueText(tone: Tone, bannedKeys: Set<string>) {
  const pool = ideaPool(tone);

  for (let i = 0; i < 30; i++) {
    const t = pickRandom(pool);
    if (!bannedKeys.has(normalizeKey(t))) return t;
  }

  for (const t of pool) {
    if (!bannedKeys.has(normalizeKey(t))) return t;
  }

  return pool[0];
}

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
  } catch {}
}

/** ✅ IMPORTANT: useSearchParams() ici, PAS dans le default export */
function ResultsInner() {
  const sp = useSearchParams();
  const username = sp.get("u") || "test";
  const topic = sp.get("topic") || "";

  const [tone, setTone] = useState<Tone>("calm");
  const [ideas, setIdeas] = useState<IdeaCard[]>([]);
  const [savedIdeas, setSavedIdeas] = useState<IdeaCard[]>([]);
  const [savedFlash, setSavedFlash] = useState<Record<string, boolean>>({});
  const [whyOpen, setWhyOpen] = useState<Record<string, boolean>>({});
  const [hydrated, setHydrated] = useState(false);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copyTimers = useRef<Record<string, any>>({});
  const flashTimers = useRef<Record<string, any>>({});

  useEffect(() => {
    const saved = loadSavedFromStorage();
    const clean = uniqBy(saved, (x) => normalizeKey(x.text));
    setSavedIdeas(clean);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveToStorage(savedIdeas);
  }, [savedIdeas, hydrated]);

  const savedKeySet = useMemo(() => new Set(savedIdeas.map((x) => normalizeKey(x.text))), [savedIdeas]);

  useEffect(() => {
    if (!hydrated) return;

    const banned = new Set<string>(savedKeySet);
    const out: IdeaCard[] = [];

    for (let i = 0; i < 3; i++) {
      const text = pickUniqueText(tone, banned);
      banned.add(normalizeKey(text));
      out.push({ id: makeId(), tone, text, why: pickWhy(tone, topic) });
    }

    setIdeas(out);
    setSavedFlash({});
    setWhyOpen({});
  }, [tone, hydrated, savedKeySet, topic]);

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
    setSavedIdeas((prev) => uniqBy([idea, ...prev], (x) => normalizeKey(x.text)));
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
      const banned = new Set<string>(savedKeySet);

      current.forEach((it, i) => {
        if (i === index) return;
        banned.add(normalizeKey(it.text));
      });

      const newText = pickUniqueText(tone, banned);
      current[index] = { id: makeId(), tone, text: newText, why: pickWhy(tone, topic) };
      return current;
    });
  }

  function regenerateAll() {
    const banned = new Set<string>(savedKeySet);
    const out: IdeaCard[] = [];

    for (let i = 0; i < 3; i++) {
      const text = pickUniqueText(tone, banned);
      banned.add(normalizeKey(text));
      out.push({ id: makeId(), tone, text, why: pickWhy(tone, topic) });
    }

    setIdeas(out);
    setSavedFlash({});
    setWhyOpen({});
  }

  function toggleWhy(id: string) {
    setWhyOpen((prev) => ({ ...prev, [id]: !prev[id] }));
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
      <div style={{ color: "#555", marginBottom: 16 }}>Choose a tone, copy an idea, or regenerate if you want something different.</div>

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

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18, marginBottom: 10 }}>
        <div style={{ fontSize: 26, fontWeight: 900 }}>✨ 3 post ideas you can use today</div>
      </div>

      <div style={{ color: "#666", marginBottom: 16 }}>Tip: copy one, post it as-is, and keep the visual calm.</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {ideas.map((idea, idx) => {
          const saved = isIdeaSaved(idea.text);
          const showFlash = !!savedFlash[idea.id];
          const copyKey = `copy-${idea.id}`;

          return (
            <div key={idea.id} style={{ border: "1px solid #e6e6e6", borderRadius: 16, padding: 16, background: "#fff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 12, color: "#777", fontWeight: 700, marginBottom: 6 }}>Idea {idx + 1}/3</div>
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
                <div style={{ marginTop: 12, padding: 12, borderRadius: 14, background: "#fafafa", border: "1px solid #eee", color: "#333", lineHeight: 1.35 }}>
                  <div style={{ fontWeight: 900, marginBottom: 4 }}>Why it works</div>
                  <div style={{ color: "#555" }}>{idea.why}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 26 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 20, fontWeight: 900 }}>⭐ Saved ideas</div>

          {savedIdeas.length > 0 && (
            <button
              onClick={onClearSaved}
              style={{ padding: "8px 12px", borderRadius: 12, border: "1px solid #cfcfcf", background: "#fff", color: "#111", fontWeight: 800, cursor: "pointer" }}
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
                      style={{ padding: "8px 12px", borderRadius: 12, border: "1px solid #111", background: "#111", color: "#fff", fontWeight: 800, cursor: "pointer" }}
                    >
                      {copiedKey === key ? "Copied ✅" : "Copy"}
                    </button>
                    <button
                      onClick={() => onRemoveSaved(it.text)}
                      style={{ padding: "8px 12px", borderRadius: 12, border: "1px solid #cfcfcf", background: "#fff", color: "#111", fontWeight: 800, cursor: "pointer" }}
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

/** ✅ DEFAULT EXPORT: uniquement Suspense + composant enfant */
export default function ResultsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 28, fontFamily: "system-ui, -apple-system" }}>Loading…</div>}>
      <ResultsInner />
    </Suspense>
  );
}