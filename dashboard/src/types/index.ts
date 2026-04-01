export interface Agent {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'error';
  monetization?: boolean;
  smart_contracts?: boolean;
}

export interface AgentStatus {
  brain: string;
  vector_db: string;
  huggingface: string;
  deepseek: string;
  grok: string;
  chatgpt: string;
  bitensor: string;
  monetization: {
    plugin_play: string;
    smart_contracts: string;
    agents: string;
    microtasks: string;
  };
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  module: string;
  message: string;
}

export interface ApiError {
  message: string;
  code: number;
}
