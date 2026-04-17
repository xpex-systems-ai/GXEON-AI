import { getAuthToken as getSupabaseAuthToken } from '../lib/supabase';

// 🌑 GXEON SOVEREIGN API — Production URL: https://gxeon-ai.xmentex2.replit.app
const API_URL = (import.meta as any).env?.VITE_API_BASE_URL || 
                (import.meta as any).env?.VITE_API_URL || 
                'https://gxeon-ai.xmentex2.replit.app';

// 🔑 System API Key — Configurado via env var no Replit
const SYSTEM_API_KEY = (import.meta as any).env?.VITE_SYSTEM_API_KEY || '';

// Supabase Auth helper - gets current session token if available
async function getAuthToken(): Promise<string | null> {
  // Use the centralized supabase client
  return getSupabaseAuthToken();
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_URL;
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // 1. Inject System API Key for Choke-Point (gxeonEnforcer expects x-gxeon-key)
    if (SYSTEM_API_KEY) {
      headers['x-gxeon-key'] = SYSTEM_API_KEY;
    }

    // 2. Inject Supabase Auth Bearer Token if user is logged in
    const authToken = await getAuthToken();
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    return headers;
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const headers = await this.getHeaders();
      
      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options?.headers,
        },
      });

      if (!response.ok) {
        // Handle specific error codes from Choke-Point
        if (response.status === 402) {
          throw new Error('GXEON_PAYMENT_REQUIRED: Insufficient credits. Please recharge.');
        }
        if (response.status === 401) {
          throw new Error('GXEON_AUTH_REQUIRED: Invalid or missing API Key.');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`[API Error] ${endpoint}:`, error);
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
