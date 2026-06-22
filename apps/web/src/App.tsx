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

  return (
    <Layout error={error} onRefresh={() => void refreshOverview()}>
      <Routes>
        <Route path="/" element={<DashboardPage account={overview.account} songs={overview.songs} tasks={overview.tasks} loading={loading} />} />
        <Route path="/quick" element={<QuickCreatePage onSuccess={refreshOverview} rules={overview.rules} />} />
        <Route path="/novel" element={<NovelStudioPage documents={overview.documents} rules={overview.rules} onSuccess={refreshOverview} />} />
        <Route path="/library" element={<LibraryPage songs={overview.songs} onSuccess={refreshOverview} />} />
        <Route path="/cover" element={<CoverStudioPage songs={overview.songs} onSuccess={refreshOverview} />} />
        <Route path="/tasks" element={<TasksPage tasks={overview.tasks} onSuccess={refreshOverview} />} />
        <Route path="/account" element={<AccountPage account={overview.account} onRefreshAccount={refreshAccount} rules={overview.rules} syncingAccount={syncing} />} />
        <Route path="/settings" element={<SettingsPage onSaved={refreshOverview} />} />
        <Route path="/assets" element={<AssetLibraryPage />} />
        <Route path="/docs" element={<DocsPage />} />
      </Routes>
    </Layout>
  );
}
