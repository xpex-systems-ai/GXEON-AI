import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import NotFound from "@/pages/not-found";
import DashboardPage from "@/pages/DashboardPage";
import TransactionsPage from "@/pages/TransactionsPage";
import CommissionsPage from "@/pages/CommissionsPage";
import ActorsPage from "@/pages/ActorsPage";
import ApiKeysPage from "@/pages/ApiKeysPage";
import DatasetsPage from "@/pages/DatasetsPage";
import HealthPage from "@/pages/HealthPage";
import RevenuePage from "@/pages/RevenuePage";
import RevenueStreamsPage from "@/pages/RevenueStreamsPage";
import SettingsPage from "@/pages/SettingsPage";
import SystemLogsPage from "@/pages/SystemLogsPage";
import GovernancePage from "@/pages/GovernancePage";
import TestPage from "@/pages/TestPage";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      {/* Standalone diagnostic page — no layout wrapper, matches original */}
      <Route path="/test" component={TestPage} />

      {/* All other routes wrapped in dashboard layout */}
      <Route>
        <DashboardLayout>
          <Switch>
            <Route path="/" component={DashboardPage} />
            <Route path="/transactions" component={TransactionsPage} />
            <Route path="/commissions" component={CommissionsPage} />
            <Route path="/actors" component={ActorsPage} />
            <Route path="/api-keys" component={ApiKeysPage} />
            <Route path="/datasets" component={DatasetsPage} />
            <Route path="/health" component={HealthPage} />
            <Route path="/revenue" component={RevenuePage} />
            <Route path="/revenue-streams" component={RevenueStreamsPage} />
            <Route path="/settings" component={SettingsPage} />
            <Route path="/system-logs" component={SystemLogsPage} />
            <Route path="/governance" component={GovernancePage} />
            <Route component={NotFound} />
          </Switch>
        </DashboardLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
