import { useState, useCallback } from "react";
import type { AccountInfo } from "@ai-music/types";
import { fetchJson } from "./useApi";
import { toReadableErrorMessage } from "../data/utils";

export function useAccount(onUpdate: (account: AccountInfo) => void) {
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  const refreshAccount = useCallback(async () => {
    try {
      setSyncing(true);
      const account = await fetchJson<AccountInfo>("/api/account");
      onUpdate(account);
      setError("");
    } catch (e) {
      setError(toReadableErrorMessage(e));
    } finally {
      setSyncing(false);
    }
  }, [onUpdate]);

  return { syncing, error, refreshAccount, setError };
}
