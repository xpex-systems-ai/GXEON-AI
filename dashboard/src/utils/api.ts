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
      success: boolean;
      agents: Array<{
        id: string;
        name: string;
        status: string;
        lastSeen?: string;
      }>;
    }>('/api/agents');
  }

  async getTasks() {
    return this.fetch<{
      success: boolean;
      tasks: Array<{
        id: string;
        type: string;
        url: string;
        status: string;
        createdAt: string;
      }>;
    }>('/api/tasks');
  }

  async getStats() {
    return this.fetch<{
      success: boolean;
      stats: {
        agents: number;
        tasks: number;
        completed: number;
        pending: number;
        balance: number;
      };
    }>('/api/stats');
  }

  async createTask(type: string, url: string) {
    return this.fetch<{
      success: boolean;
      task: {
        id: string;
        type: string;
        url: string;
        status: string;
        createdAt: string;
      };
    }>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ type, url }),
    });
  }

  async submitTaskResult(taskId: string, result: string) {
    return this.fetch<{
      success: boolean;
      message: string;
    }>('/api/tasks/result', {
      method: 'POST',
      body: JSON.stringify({ taskId, result }),
    });
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
