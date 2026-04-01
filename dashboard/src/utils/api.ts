const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_URL;
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error for ${endpoint}:`, error);
      throw error;
    }
  }

  async getHealth() {
    return this.fetch<{
      status: string;
      timestamp: string;
      uptime: number;
      version: string;
    }>('/health');
  }

  async getAgents() {
    return this.fetch<{
      agents: Array<{
        id: string;
        name: string;
        type: string;
        status: string;
      }>;
      status: {
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
      };
    }>('/agents');
  }

  async getLogs() {
    return this.fetch<{
      logs: Array<{
        id: string;
        timestamp: string;
        level: string;
        module: string;
        message: string;
      }>;
    }>('/logs');
  }
}

export const apiClient = new ApiClient();
