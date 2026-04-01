"use client";

import { useState, useEffect, useCallback } from "react";
import { useRunwayStore } from "@/store/runway-store";

export default function BrexConnector() {
  const brexToken = useRunwayStore((s) => s.brexToken);
  const setBrexToken = useRunwayStore((s) => s.setBrexToken);
  const syncBrex = useRunwayStore((s) => s.syncBrex);
  const brexSyncing = useRunwayStore((s) => s.brexSyncing);
  const brexLastSynced = useRunwayStore((s) => s.brexLastSynced);
  const error = useRunwayStore((s) => s.error);

  const [tokenInput, setTokenInput] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [envConfigured, setEnvConfigured] = useState(false);

  useEffect(() => {
    fetch("/api/brex/status")
      .then((r) => r.json())
      .then((d) => setEnvConfigured(d.configured))
      .catch(() => {});
  }, []);

  const isConnected = !!brexToken || envConfigured;

  const handleSync = useCallback(() => {
    // If no client-side token but env is configured, sync with empty token (server falls back to env)
    if (!brexToken && envConfigured) {
      setBrexToken("__env__");
    }
    syncBrex();
  }, [brexToken, envConfigured, setBrexToken, syncBrex]);

  function handleConnect() {
    if (!tokenInput.trim()) return;
    setBrexToken(tokenInput.trim());
    setTokenInput("");
    setShowInput(false);
  }

  function handleDisconnect() {
    setBrexToken("");
  }

  if (isConnected) {
    return (
      <div className="rounded-xl border border-orange-800/50 bg-orange-950/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-2.5 w-2.5 rounded-full ${brexSyncing ? "bg-orange-400 animate-pulse" : "bg-orange-400"}`} />
            <span className="text-sm text-orange-300">
              Brex connected{envConfigured && !brexToken ? " (via env)" : ""}
            </span>
            {brexLastSynced && (
              <span className="text-xs text-zinc-500">
                Last synced: {new Date(brexLastSynced).toLocaleTimeString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSync}
              disabled={brexSyncing}
              className="rounded-lg bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-700 px-3 py-1.5 text-xs font-medium text-white transition-colors"
            >
              {brexSyncing ? "Syncing..." : "Sync Brex"}
            </button>
            {brexToken && (
              <button
                onClick={handleDisconnect}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>
        {error && error.toLowerCase().includes("brex") && (
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
          <span className="text-sm text-zinc-400">Brex not connected</span>
        </div>
        {!showInput && (
          <button
            onClick={() => setShowInput(true)}
            className="rounded-lg bg-orange-600 hover:bg-orange-500 px-3 py-1.5 text-xs font-medium text-white transition-colors"
          >
            Connect Brex
          </button>
        )}
      </div>

      {showInput && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-zinc-400">
            Enter your Brex API token, or set <code className="text-zinc-300">BREX_API_TOKEN</code> in <code className="text-zinc-300">.env.local</code>.
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              placeholder="bxt_..."
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConnect()}
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-orange-500 transition-colors font-mono"
            />
            <button
              onClick={handleConnect}
              disabled={!tokenInput.trim()}
              className="rounded-lg bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-700 px-4 py-1.5 text-xs font-medium text-white transition-colors"
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
