export const gxeoneDeployEngine = {
  version: "1.0",
  system: "GXEONE PRODUCTION DEPLOY ENGINE",
  mode: "AUTONOMOUS_DEPLOYMENT_READY",
  objective: {
    primary_goal: "Deploy full GXEONE system to production with minimal manual intervention",
    secondary_goal: "Enable dashboard live view + backend runtime + monetization hooks",
    final_state: "system_live_with_placeholder_keys",
  },
  deployment_targets: {
    railway: {
      role: "backend_runtime",
      actions: [
        "git_pull_latest",
        "install_dependencies",
        "run_build",
        "start_api_server",
        "start_workers",
        "enable_webhooks",
      ],
      env_required: [
        "PORT",
        "DATABASE_URL",
        "SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
        "JWT_SECRET",
        "RAILWAY_ENVIRONMENT",
      ],
    },
    vercel: {
      role: "frontend_dashboard",
      project_root: "/gxeone-dashboard",
      framework: "Next.js or Vite SPA",
      actions: [
        "vercel_link_project",
        "set_root_directory",
        "install_dependencies",
        "build_frontend",
        "deploy_preview",
        "deploy_production",
      ],
      env_required: [
        "NEXT_PUBLIC_API_URL",
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      ],
    },
  },
  system_boot_sequence: [
    "STEP 1 → Validate repository structure",
    "STEP 2 → Install all dependencies (pnpm install)",
    "STEP 3 → Build backend (Railway runtime)",
    "STEP 4 → Build frontend (Vercel dashboard)",
    "STEP 5 → Deploy backend to Railway",
    "STEP 6 → Deploy frontend to Vercel",
    "STEP 7 → Connect dashboard to API gateway",
    "STEP 8 → Activate monitoring + radar feeds",
  ],
  dashboard_runtime_binding: {
    source_of_truth: "Railway API server",
    frontend_binding: {
      dashboard_path: "/gxeone-dashboard",
      api_connection: "/api",
      radar_feed: "/api/radar/live",
      health_feed: "/api/health",
      financial_feed: "/api/finance",
    },
    render_mode: "real_time_json_stream",
  },
  monetization_activation: {
    status: "READY_BUT_INACTIVE",
    activation_trigger: "ENV_KEYS_SET",
    enabled_modules: [
      "api_saas_billing",
      "radar_intelligence_api",
      "automation_agents_api",
      "subscription_dashboard_access",
    ],
    locked_until_keys: ["SUPABASE_SERVICE_ROLE_KEY", "PAYMENT_PROVIDER_KEY"],
  },
  railway_runtime_map: {
    services: [
      { name: "api-server", entry: "server/index.ts", status: "ACTIVE" },
      { name: "worker-system", entry: "workers/index.ts", status: "ACTIVE" },
      { name: "webhook-handler", entry: "webhooks/index.ts", status: "ACTIVE" },
    ],
  },
  vercel_frontend_map: {
    project_name: "gxeone-dashboard",
    framework: "nextjs_or_vite",
    entry_point: "pages/index.tsx or app/page.tsx",
    dashboard_modules: [
      "Radar Center",
      "War Room",
      "Monetization Panel",
      "Railway Live Status",
      "API Health Monitor",
      "Agent Center",
    ],
  },
  health_checks: {
    backend: "/api/health",
    workers: "/api/workers/health",
    webhooks: "/api/webhooks/health",
    database: "/api/db/health",
  },
  deployment_mode: {
    type: "zero_touch_after_config",
    manual_input_required_only_for: [
      "environment variables",
      "api keys",
      "supabase credentials",
      "payment provider keys",
    ],
  },
  final_instruction: {
    summary: "After execution, system will be live with dashboard + backend + monitoring. Monetization will remain dormant until keys are injected.",
    next_state: "LIVE_SYSTEM_WITH_LOCKED_MONETIZATION",
  },
} as const;

export const vercelEnvAliases: Record<string, readonly string[]> = {
  NEXT_PUBLIC_API_URL: ["VITE_API_URL", "NEXT_PUBLIC_API_URL"],
  NEXT_PUBLIC_SUPABASE_URL: ["VITE_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"],
  NEXT_PUBLIC_SUPABASE_ANON_KEY: ["VITE_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
};

export type GxeoneDeployEngine = typeof gxeoneDeployEngine;
