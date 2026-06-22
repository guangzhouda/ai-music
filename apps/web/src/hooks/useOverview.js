import { useState, useEffect, useCallback } from "react";
import { fetchJson } from "./useApi";
import { toReadableErrorMessage } from "../data/utils";
const emptyOverview = {
    account: { provider: "sunoapi", mode: "mock", creditsRemaining: 0, callbackConfigured: false, lastCheckedAt: null },
    songs: [],
    tasks: [],
    documents: [],
    rules: []
};
export function useOverview() {
    const [overview, setOverview] = useState(emptyOverview);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const refreshOverview = useCallback(async () => {
        try {
            setLoading(true);
            const [overviewResult, accountResult] = await Promise.allSettled([
                fetchJson("/api/overview"),
                fetchJson("/api/account")
            ]);
            if (overviewResult.status !== "fulfilled")
                throw overviewResult.reason;
            setOverview({
                ...overviewResult.value,
                account: accountResult.status === "fulfilled" ? accountResult.value : overviewResult.value.account
            });
            setError("");
        }
        catch (e) {
            setError(toReadableErrorMessage(e));
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { void refreshOverview(); }, [refreshOverview]);
    return { overview, loading, error, refreshOverview, setOverview };
}
