import { API_BASE } from '../config/api';

const API_URL = API_BASE || (import.meta as any).env?.VITE_API_URL || '';

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_URL;
    console.log('[API] Base URL:', this.baseUrl || 'Using relative paths');
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      if (!fetch) {
        console.error('[API] fetch not available');
        throw new Error('fetch not available');
      }
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response || !response.ok) {
        console.warn(`[API] Response invalid for ${endpoint}:`, response?.status);
        throw new Error(`HTTP ${response?.status || 'unknown'}`);
      }

      const data = await response.json();
      console.log(`[API] Data from ${endpoint}:`, data);
      return data;
    } catch (error) {
      console.error(`[API] Error for ${endpoint}:`, error);
      // Return safe default instead of throwing
      return {} as T;
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
