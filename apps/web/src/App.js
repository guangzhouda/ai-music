import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { useOverview } from "./hooks/useOverview";
import { useAccount } from "./hooks/useAccount";
import { DashboardPage } from "./pages/DashboardPage";
import { DocsPage } from "./pages/DocsPage";
import { QuickCreatePage } from "./pages/QuickCreatePage";
import { NovelStudioPage } from "./pages/NovelStudioPage";
import { LibraryPage } from "./pages/LibraryPage";
import { CoverStudioPage } from "./pages/CoverStudioPage";
import { TasksPage } from "./pages/TasksPage";
import { AccountPage } from "./pages/AccountPage";
import { SettingsPage } from "./pages/SettingsPage";
import { AssetLibraryPage } from "./pages/AssetLibraryPage";
export default function App() {
    const { overview, loading, error, refreshOverview, setOverview } = useOverview();
    const { syncing, refreshAccount } = useAccount((account) => {
        setOverview((prev) => ({ ...prev, account }));
    });
    return (_jsx(Layout, { error: error, onRefresh: () => void refreshOverview(), children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(DashboardPage, { account: overview.account, songs: overview.songs, tasks: overview.tasks, loading: loading }) }), _jsx(Route, { path: "/quick", element: _jsx(QuickCreatePage, { onSuccess: refreshOverview, rules: overview.rules }) }), _jsx(Route, { path: "/novel", element: _jsx(NovelStudioPage, { documents: overview.documents, rules: overview.rules, onSuccess: refreshOverview }) }), _jsx(Route, { path: "/library", element: _jsx(LibraryPage, { songs: overview.songs, onSuccess: refreshOverview }) }), _jsx(Route, { path: "/cover", element: _jsx(CoverStudioPage, { songs: overview.songs, onSuccess: refreshOverview }) }), _jsx(Route, { path: "/tasks", element: _jsx(TasksPage, { tasks: overview.tasks, onSuccess: refreshOverview }) }), _jsx(Route, { path: "/account", element: _jsx(AccountPage, { account: overview.account, onRefreshAccount: refreshAccount, rules: overview.rules, syncingAccount: syncing }) }), _jsx(Route, { path: "/settings", element: _jsx(SettingsPage, { onSaved: refreshOverview }) }), _jsx(Route, { path: "/assets", element: _jsx(AssetLibraryPage, {}) }), _jsx(Route, { path: "/docs", element: _jsx(DocsPage, {}) })] }) }));
}
