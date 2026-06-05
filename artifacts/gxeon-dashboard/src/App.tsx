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
import ConversionPage from "@/pages/ConversionPage";
import LiveRuntimePage from "@/pages/LiveRuntimePage";
import RevenueEnginePage from "@/pages/RevenueEnginePage";
import OperationalDashboardPage from "@/pages/OperationalDashboardPage";
import DeployEnginePage from "@/pages/DeployEnginePage";
import GxeonOSPage from "@/pages/GxeonOSPage";

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
            <Route path="/" component={() => <GxeonOSPage moduleId="command_center" />} />
            <Route path="/war-room" component={() => <GxeonOSPage moduleId="war_room" />} />
            <Route path="/radar-x" component={() => <GxeonOSPage moduleId="radar_x" />} />
            <Route path="/agent-hub" component={() => <GxeonOSPage moduleId="agent_hub" />} />
            <Route path="/marketplace" component={() => <GxeonOSPage moduleId="marketplace" />} />
            <Route path="/task-engine" component={() => <GxeonOSPage moduleId="task_engine" />} />
            <Route path="/financial-core" component={() => <GxeonOSPage moduleId="financial_core" />} />
            <Route path="/ledger" component={() => <GxeonOSPage moduleId="ledger" />} />
            <Route path="/blockchain" component={() => <GxeonOSPage moduleId="blockchain" />} />
            <Route path="/api-gateway" component={() => <GxeonOSPage moduleId="api_gateway" />} />
            <Route path="/integrations" component={() => <GxeonOSPage moduleId="integrations" />} />
            <Route path="/analytics" component={() => <GxeonOSPage moduleId="analytics" />} />
            <Route path="/automation" component={() => <GxeonOSPage moduleId="automation" />} />
            <Route path="/legacy-dashboard" component={DashboardPage} />
            <Route path="/transactions" component={TransactionsPage} />
            <Route path="/commissions" component={CommissionsPage} />
            <Route path="/actors" component={ActorsPage} />
            <Route path="/api-keys" component={ApiKeysPage} />
            <Route path="/datasets" component={DatasetsPage} />
            <Route path="/health" component={HealthPage} />
            <Route path="/revenue" component={RevenuePage} />
            <Route path="/revenue-engine" component={RevenueEnginePage} />
            <Route path="/revenue-streams" component={RevenueStreamsPage} />
            <Route path="/settings" component={() => <GxeonOSPage moduleId="settings" />} />
            <Route path="/legacy-settings" component={SettingsPage} />
            <Route path="/system-logs" component={SystemLogsPage} />
            <Route path="/governance" component={GovernancePage} />
            <Route path="/conversion" component={ConversionPage} />
            <Route path="/live-runtime" component={LiveRuntimePage} />
            <Route path="/operational-dashboard" component={OperationalDashboardPage} />
            <Route path="/deploy-engine" component={DeployEnginePage} />
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
