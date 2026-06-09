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
import OpportunityInboxPage from "@/pages/OpportunityInboxPage";
import TaskQueuePage from "@/pages/TaskQueuePage";
import ExecutionTrackerPage from "@/pages/ExecutionTrackerPage";
import DeliveryValidationPage from "@/pages/DeliveryValidationPage";
import RevenueReleaseGatePage from "@/pages/RevenueReleaseGatePage";
import FinancialLedgerPage from "@/pages/FinancialLedgerPage";
import MonetizationBoardPage from "@/pages/MonetizationBoardPage";
import AgentConectouPage from "@/pages/AgentConectouPage";
import RadarXOperationalPage from "@/pages/RadarXOperationalPage";
import ConnectorGatewayPage from "@/pages/ConnectorGatewayPage";
import ConnectorDetailPage from "@/pages/ConnectorDetailPage";
import GitHubReadonlyConnectorPage from "@/pages/GitHubReadonlyConnectorPage";
import VercelReadonlyConnectorPage from "@/pages/VercelReadonlyConnectorPage";
import RailwayReadonlyConnectorPage from "@/pages/RailwayReadonlyConnectorPage";
import SupabaseReadonlyConnectorPage from "@/pages/SupabaseReadonlyConnectorPage";
import HealthPage from "@/pages/HealthPage";

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
            <Route path="/ops/opportunities" component={OpportunityInboxPage} />
            <Route path="/ops/tasks" component={TaskQueuePage} />
            <Route path="/ops/execution" component={ExecutionTrackerPage} />
            <Route path="/ops/validation" component={DeliveryValidationPage} />
            <Route path="/ops/release" component={RevenueReleaseGatePage} />
            <Route path="/ops/ledger" component={FinancialLedgerPage} />
            <Route path="/ops/monetization" component={MonetizationBoardPage} />
            <Route path="/ops/agent-conectou" component={AgentConectouPage} />
            <Route path="/ops/radar-x" component={RadarXOperationalPage} />
            <Route path="/ops/connectors/github" component={GitHubReadonlyConnectorPage} />
            <Route path="/ops/connectors/vercel" component={VercelReadonlyConnectorPage} />
            <Route path="/ops/connectors/railway" component={RailwayReadonlyConnectorPage} />
            <Route path="/ops/connectors/supabase" component={SupabaseReadonlyConnectorPage} />
            <Route path="/ops/connectors/m365" component={() => <ConnectorDetailPage connectorId="microsoft365" />} />
            <Route path="/ops/connectors" component={ConnectorGatewayPage} />
            <Route path="/health" component={HealthPage} />
            <Route path="/ops/health" component={HealthPage} />
            {moduleRoutes.map(([path, moduleId]) => (
              <Route key={path} path={path} component={() => <GxeonOSPage moduleId={moduleId} />} />
            ))}
            <Route path="/placeholder/:moduleId/:blockSlug" component={() => <GxeonPlaceholderPage />} />
            {professionalPlaceholderRoutes.map(([path, moduleId, blockTitle]) => (
              <Route key={path} path={path} component={() => <GxeonPlaceholderPage moduleId={moduleId} blockTitle={blockTitle} />} />
            ))}
            <Route path="/legacy-dashboard" component={DashboardPage} />
            <Route path="/legacy-settings" component={SettingsPage} />
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
