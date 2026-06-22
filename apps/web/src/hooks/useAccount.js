import { useState, useCallback } from "react";
import { fetchJson } from "./useApi";
import { toReadableErrorMessage } from "../data/utils";
export function useAccount(onUpdate) {
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState("");
    const refreshAccount = useCallback(async () => {
        try {
            setSyncing(true);
            const account = await fetchJson("/api/account");
            onUpdate(account);
            setError("");
        }
        catch (e) {
            setError(toReadableErrorMessage(e));
        }
        finally {
            setSyncing(false);
        }
    }, [onUpdate]);
    return { syncing, error, refreshAccount, setError };
}
