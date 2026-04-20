"use client";

import { useState } from "react";
import toast from "react-hot-toast";

type LanguageRow = {
  id: string;
  code: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
};

export function AdminLanguagesClient({ initial }: { initial: LanguageRow[] }) {
  const [items, setItems] = useState(initial);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const createLanguage = async () => {
    if (!code.trim() || !name.trim()) return;
    setBusy("create");
    try {
      const res = await fetch("/api/admin/languages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim().toLowerCase(), name: name.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as LanguageRow & { error?: string };
      if (!res.ok) {
        toast.error(data.error || "Failed");
        return;
      }
      setItems((prev) => [...prev, data].sort((a, b) => a.sortOrder - b.sortOrder));
      setCode("");
      setName("");
      toast.success("Added");
    } finally {
      setBusy(null);
    }
  };

  const updateLanguage = async (id: string, patch: Partial<LanguageRow>) => {
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/languages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = (await res.json().catch(() => ({}))) as LanguageRow & { error?: string };
      if (!res.ok) {
        toast.error(data.error || "Failed");
        return;
      }
      setItems((prev) => prev.map((x) => (x.id === id ? data : x)));
    } finally {
      setBusy(null);
    }
  };

  const removeLanguage = async (id: string) => {
    if (!confirm("Delete language?")) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/languages/${id}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error || "Failed");
        return;
      }
      setItems((prev) => prev.filter((x) => x.id !== id));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold text-warm-900">Languages</h1>
      <div className="rounded-2xl border border-warm-100 bg-white p-4 space-y-3">
        <p className="text-sm font-medium text-warm-700">Add language</p>
        <div className="grid gap-2 md:grid-cols-[160px_1fr_auto]">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="ja"
            className="rounded-xl border border-warm-200 px-3 py-2 text-sm"
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Japanese"
            className="rounded-xl border border-warm-200 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void createLanguage()}
            disabled={busy === "create"}
            className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-800"
          >
            Add
          </button>
        </div>
      </div>
      <ul className="space-y-3">
        {items
          .slice()
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((row) => (
            <li key={row.id} className="rounded-2xl border border-warm-100 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-warm-900">
                    {row.name} ({row.code.toUpperCase()})
                  </p>
                  <p className="text-xs text-warm-500">
                    {row.isDefault ? "default" : "secondary"} · {row.isActive ? "active" : "inactive"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void updateLanguage(row.id, { isActive: !row.isActive })}
                    disabled={busy === row.id}
                    className="rounded-xl border border-warm-200 px-3 py-1.5 text-xs font-semibold text-warm-700"
                  >
                    {row.isActive ? "Disable" : "Enable"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void updateLanguage(row.id, { isDefault: true })}
                    disabled={busy === row.id || row.isDefault}
                    className="rounded-xl border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-800"
                  >
                    Set default
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeLanguage(row.id)}
                    disabled={busy === row.id}
                    className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
      </ul>
    </div>
  );
}
