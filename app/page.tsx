"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [u, setU] = useState("");
  const [topic, setTopic] = useState("");

  // Load last inputs
  useEffect(() => {
    try {
      const lastU = localStorage.getItem("clarity_last_u") || "";
      const lastT = localStorage.getItem("clarity_last_topic") || "";
      setU(lastU);
      setTopic(lastT);
    } catch {}
  }, []);

  // Save inputs as user types
  useEffect(() => {
    try {
      localStorage.setItem("clarity_last_u", u);
      localStorage.setItem("clarity_last_topic", topic);
    } catch {}
  }, [u, topic]);

  const username = u.trim().replace(/^@/, "");
  const t = topic.trim();
  const canGo = !!username && !!t;

  function go() {
    if (!username) return alert("Écris ton @ (sans espaces).");
    if (!t) return alert("Écris un topic (ex: productivité, skincare, étude...).");

    const url = `/results?u=${encodeURIComponent(username)}&topic=${encodeURIComponent(t)}`;
    router.push(url);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") go();
  }

  return (
    <main
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: 28,
        fontFamily: "system-ui, -apple-system",
      }}
    >
      <h1 style={{ fontSize: 44, margin: "0 0 8px 0" }}>Clarity</h1>
      <p style={{ color: "#666", marginTop: 0 }}>
        Donne ton @ et un topic → on te génère 3 idées de posts.
      </p>

      <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
        <div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Your X username</div>
          <input
            value={u}
            onChange={(e) => setU(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="@lauren"
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 12,
              border: "1px solid #ddd",
              fontSize: 16,
            }}
          />
        </div>

        <div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Topic</div>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="ex: productivité, skincare, études, finance..."
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 12,
              border: "1px solid #ddd",
              fontSize: 16,
            }}
          />
        </div>

        <button
          onClick={go}
          disabled={!canGo}
          style={{
            marginTop: 6,
            padding: "12px 14px",
            borderRadius: 14,
            border: "1px solid #111",
            background: canGo ? "#111" : "#f2f2f2",
            color: canGo ? "#fff" : "#999",
            fontWeight: 800,
            cursor: canGo ? "pointer" : "not-allowed",
            fontSize: 16,
          }}
        >
          Generate 3 ideas →
        </button>
      </div>

      <div style={{ marginTop: 16, color: "#777", fontSize: 13 }}>
        Tip: tu peux appuyer sur <b>Enter</b> pour générer. <br />
        Exemple topic: “productivité”, “études”, “recettes”, “investissement”.
      </div>
    </main>
  );
}