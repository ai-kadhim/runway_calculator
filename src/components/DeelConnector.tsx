"use client";

import { useState, useEffect, useCallback } from "react";
import { useRunwayStore } from "@/store/runway-store";

export default function DeelConnector() {
  const deelToken = useRunwayStore((s) => s.deelToken);
  const setDeelToken = useRunwayStore((s) => s.setDeelToken);
  const syncDeel = useRunwayStore((s) => s.syncDeel);
  const deelSyncing = useRunwayStore((s) => s.deelSyncing);
  const deelLastSynced = useRunwayStore((s) => s.deelLastSynced);
  const error = useRunwayStore((s) => s.error);

  const [tokenInput, setTokenInput] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [envConfigured, setEnvConfigured] = useState(false);

  useEffect(() => {
    fetch("/api/deel/status")
      .then((r) => r.json())
      .then((d) => setEnvConfigured(d.configured))
      .catch(() => {});
  }, []);

  const isConnected = !!deelToken || envConfigured;

  const handleSync = useCallback(() => {
    if (!deelToken && envConfigured) {
      setDeelToken("__env__");
    }
    syncDeel();
  }, [deelToken, envConfigured, setDeelToken, syncDeel]);

  function handleConnect() {
    if (!tokenInput.trim()) return;
    setDeelToken(tokenInput.trim());
    setTokenInput("");
    setShowInput(false);
  }

  function handleDisconnect() {
    setDeelToken("");
  }

  if (isConnected) {
    return (
      <div className="rounded-xl border border-blue-800/50 bg-blue-950/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-2.5 w-2.5 rounded-full ${deelSyncing ? "bg-blue-400 animate-pulse" : "bg-blue-400"}`} />
            <span className="text-sm text-blue-300">
              Deel connected{envConfigured && !deelToken ? " (via env)" : ""}
            </span>
            {deelLastSynced && (
              <span className="text-xs text-zinc-500">
                Last synced: {new Date(deelLastSynced).toLocaleTimeString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSync}
              disabled={deelSyncing}
              className="rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 px-3 py-1.5 text-xs font-medium text-white transition-colors"
            >
              {deelSyncing ? "Syncing..." : "Sync Payroll"}
            </button>
            {deelToken && (
              <button
                onClick={handleDisconnect}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>
        {error && error.toLowerCase().includes("deel") && (
          <p className="mt-2 text-sm text-rose-400">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
          <span className="text-sm text-zinc-400">Deel not connected</span>
        </div>
        {!showInput && (
          <button
            onClick={() => setShowInput(true)}
            className="rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-xs font-medium text-white transition-colors"
          >
            Connect Deel
          </button>
        )}
      </div>

      {showInput && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-zinc-400">
            Enter your Deel API token, or set <code className="text-zinc-300">DEEL_API_TOKEN</code> in <code className="text-zinc-300">.env.local</code>.
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              placeholder="deel_..."
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConnect()}
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors font-mono"
            />
            <button
              onClick={handleConnect}
              disabled={!tokenInput.trim()}
              className="rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 px-4 py-1.5 text-xs font-medium text-white transition-colors"
            >
              Connect
            </button>
            <button
              onClick={() => { setShowInput(false); setTokenInput(""); }}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
