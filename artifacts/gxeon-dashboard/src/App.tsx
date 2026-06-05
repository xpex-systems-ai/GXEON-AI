import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import NotFound from "@/pages/not-found";
import DashboardPage from "@/pages/DashboardPage";
import SettingsPage from "@/pages/SettingsPage";
import TestPage from "@/pages/TestPage";
import GxeonOSPage from "@/pages/GxeonOSPage";
import GxeonPlaceholderPage from "@/pages/GxeonPlaceholderPage";
import ConversionPage from "@/pages/ConversionPage";
import LiveRuntimePage from "@/pages/LiveRuntimePage";
import RevenueEnginePage from "@/pages/RevenueEnginePage";
import OperationalDashboardPage from "@/pages/OperationalDashboardPage";
import DeployEnginePage from "@/pages/DeployEnginePage";
import GxeonOSPage from "@/pages/GxeonOSPage";

const queryClient = new QueryClient();

const moduleRoutes = [
  ["/", "command_center"],
  ["/war-room", "war_room"],
  ["/radar-x", "radar_x"],
  ["/agent-hub", "agent_hub"],
  ["/marketplace", "marketplace"],
  ["/task-engine", "task_engine"],
  ["/financial-core", "financial_core"],
  ["/ledger", "ledger"],
  ["/blockchain", "blockchain"],
  ["/api-gateway", "api_gateway"],
  ["/integrations", "integrations"],
  ["/analytics", "analytics"],
  ["/automation", "automation"],
  ["/settings", "settings"],
] as const;

const professionalPlaceholderRoutes = [
  ["/transactions", "ledger", "Transactions"],
  ["/commissions", "financial_core", "Commissions"],
  ["/actors", "agent_hub", "Actors"],
  ["/api-keys", "api_gateway", "API Keys"],
  ["/datasets", "analytics", "Datasets"],
  ["/health", "command_center", "System Health"],
  ["/revenue", "financial_core", "Revenue"],
  ["/revenue-engine", "financial_core", "Revenue Engine"],
  ["/revenue-streams", "financial_core", "Revenue Streams"],
  ["/system-logs", "command_center", "System Logs"],
  ["/governance", "war_room", "Git Governance"],
  ["/conversion", "analytics", "Conversion Center"],
  ["/live-runtime", "command_center", "Live Runtime"],
  ["/operational-dashboard", "command_center", "Operational Dashboard"],
  ["/deploy-engine", "automation", "Deploy Engine"],
] as const;

function Router() {
  return (
    <Switch>
      {/* Standalone diagnostic page — no layout wrapper, matches original */}
      <Route path="/test" component={TestPage} />

      {/* All other routes wrapped in dashboard layout */}
      <Route>
        <DashboardLayout>
          <Switch>
            {moduleRoutes.map(([path, moduleId]) => (
              <Route key={path} path={path} component={() => <GxeonOSPage moduleId={moduleId} />} />
            ))}
            <Route path="/placeholder/:moduleId/:blockSlug" component={() => <GxeonPlaceholderPage />} />
            {professionalPlaceholderRoutes.map(([path, moduleId, blockTitle]) => (
              <Route key={path} path={path} component={() => <GxeonPlaceholderPage moduleId={moduleId} blockTitle={blockTitle} />} />
            ))}
            <Route path="/legacy-dashboard" component={DashboardPage} />
            <Route path="/legacy-settings" component={SettingsPage} />
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
