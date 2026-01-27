"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function ResultsPage() {
  const [username, setUsername] = useState("@unknown");

  useEffect(() => {
    const saved = sessionStorage.getItem("proof_username");
    if (saved && saved.trim().length > 0) {
      setUsername(saved.startsWith("@") ? saved : `@${saved}`);
    }
  }, []);

  return (
    <main className="min-h-screen bg-white text-black px-6 py-12">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-semibold mb-2">Results</h1>

        <Link href="/" className="text-sm underline text-zinc-600">
          ← Back
        </Link>

        <p className="mt-6 text-zinc-700">
          Analysis for <span className="font-medium text-black">{username}</span>
        </p>

        <div className="mt-8 space-y-6">
          <div>
            <div className="font-semibold mb-1">Top insight</div>
            <div className="text-zinc-700">
              Calm visuals + short text tend to perform best.
            </div>
          </div>

          <div>
            <div className="font-semibold mb-2">3 patterns</div>
            <ul className="list-disc pl-5 text-zinc-700 space-y-1">
              <li>Best posting window: 18:00–21:00</li>
              <li>Less text → more engagement</li>
              <li>Consistency beats viral luck</li>
            </ul>
          </div>

          <div>
            <div className="font-semibold mb-1">1 recommendation</div>
            <div className="text-zinc-700">
              Post once per day with one clear idea and a calm tone.
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}