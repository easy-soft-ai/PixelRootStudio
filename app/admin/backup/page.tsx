"use client";

import { useEffect, useRef, useState } from "react";

type BackupInfo = {
  uploads: {
    fileCount: number;
    totalBytes: number;
    totalSize: string;
  };
};

export default function AdminBackupPage() {
  const [info, setInfo] = useState<BackupInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/admin/backup")
      .then((res) => res.json())
      .then((data) => {
        setInfo(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load backup info");
        setLoading(false);
      });
  }, []);

  async function handleDownload() {
    setDownloading(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch("/api/admin/backup", { method: "POST" });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Download failed");
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] || "pixelroot-backup.zip";

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);

      setMessage(`Backup downloaded: ${filename}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(false);
      setTimeout(() => setMessage(""), 5000);
    }
  }

  async function handleRestore(file: File) {
    if (!file.name.toLowerCase().endsWith(".zip")) {
      setError("Please upload a .zip backup file.");
      return;
    }

    const confirmed = window.confirm(
      "Restore this backup? This replaces the current database and ALL uploaded images. A snapshot of your current data is saved automatically before restore."
    );
    if (!confirmed) return;

    setRestoring(true);
    setMessage("");
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/backup/restore", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Restore failed");
      }

      setMessage(data.message || "Backup restored successfully.");
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Restore failed");
    } finally {
      setRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  if (loading) {
    return <div className="text-white/50">Loading...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Backup & Restore</h1>
        <p className="text-sm text-white/50 mt-1">
          Download a single ZIP containing the full database and every uploaded file, or restore
          everything from a previous backup.
        </p>
      </div>

      {(message || error) && (
        <div
          className={`p-3 rounded-lg text-sm ${
            error ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"
          }`}
        >
          {error || message}
        </div>
      )}

      <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-white">Download Backup</h2>
          <p className="text-xs text-white/40 mt-1">
            A single <code className="text-white/60">.zip</code> named with the current date and time,
            containing <code className="text-white/60">database.sql</code> and the entire uploads folder
            ({info?.uploads.fileCount ?? 0} files, {info?.uploads.totalSize ?? "0 B"}).
          </p>
        </div>
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="w-full sm:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50 text-slate-900 font-semibold rounded-lg transition-colors"
        >
          {downloading ? "Preparing…" : "Download Backup (ZIP)"}
        </button>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-white">Restore Backup</h2>
          <p className="text-xs text-white/40 mt-1">
            Upload a backup <code className="text-white/60">.zip</code> to restore the database and all
            uploaded files. Your current data is auto-saved to{" "}
            <code className="text-white/60">data/backups/</code> before the restore runs.
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".zip,application/zip,application/x-zip-compressed"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleRestore(file);
          }}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={restoring}
          className="w-full sm:w-auto px-5 py-2.5 bg-red-500/15 hover:bg-red-500/25 disabled:opacity-50 text-red-300 font-semibold rounded-lg border border-red-500/30 transition-colors"
        >
          {restoring ? "Restoring…" : "Upload & Restore Backup"}
        </button>
      </div>
    </div>
  );
}
