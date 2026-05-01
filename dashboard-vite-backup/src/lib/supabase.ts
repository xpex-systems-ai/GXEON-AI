import { createClient } from '@supabase/supabase-js';

console.log('🔧 [Supabase] Module loading...');

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

console.log('🔧 [Supabase] ENV check:', {
  VITE_SUPABASE_URL: !!(import.meta as any).env?.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: !!(import.meta as any).env?.VITE_SUPABASE_ANON_KEY,
  FINAL_URL: supabaseUrl ? 'SET' : 'NOT SET',
  FINAL_KEY: supabaseAnonKey ? 'SET' : 'NOT SET'
});

// Create a mock client if credentials are missing/invalid
const isSupabaseEnabled = supabaseUrl && supabaseAnonKey && supabaseAnonKey.length > 20;

if (!isSupabaseEnabled) {
  if (import.meta.env.PROD) {
    throw new Error(
      '[Supabase] FATAL: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required in production. ' +
      'Add them to your .env file or deployment environment variables.'
    );
  }
  console.warn('⚠️ [Supabase] Missing or invalid credentials. Realtime features DISABLED.');
  console.warn('⚠️ [Supabase] To enable: Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to env vars.');
}

// Create real client if enabled, otherwise create mock
export const supabase = isSupabaseEnabled 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : createMockSupabase();

/**
 * Subscribe to real-time system updates
 * Listens for changes on 'tasks', 'logs', and 'keeper_rewards' tables
 */
export function subscribeToSystemUpdates(
  onTaskChange?: (payload: any) => void,
  onLogChange?: (payload: any) => void,
  onRewardChange?: (payload: any) => void
) {
  const channels: any[] = [];

  // Subscribe to tasks table changes
  if (onTaskChange) {
    const tasksChannel = supabase
      .channel('tasks-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          console.log('[Realtime] Task change:', payload);
          onTaskChange(payload);
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Tasks subscription status:', status);
      });
    channels.push(tasksChannel);
  }

  // Subscribe to logs table changes
  if (onLogChange) {
    const logsChannel = supabase
      .channel('logs-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'logs' },
        (payload) => {
          console.log('[Realtime] Log change:', payload);
          onLogChange(payload);
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Logs subscription status:', status);
      });
    channels.push(logsChannel);
  }

  // Subscribe to keeper_rewards table changes
  if (onRewardChange) {
    const rewardsChannel = supabase
      .channel('rewards-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'keeper_rewards' },
        (payload) => {
          console.log('[Realtime] Keeper reward change:', payload);
          onRewardChange(payload);
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Keeper rewards subscription status:', status);
      });
    channels.push(rewardsChannel);
  }

  // Return cleanup function
  return () => {
    channels.forEach(channel => {
      supabase.removeChannel(channel);
    });
    console.log('[Realtime] Unsubscribed from all channels');
  };
}

/**
 * Subscribe specifically to keeper rewards updates
 * Listens for INSERT events on 'keeper_rewards' table
 */
export function subscribeToKeeperRewards(
  onRewardInsert?: (payload: any) => void,
  onRewardUpdate?: (payload: any) => void
) {
  const channels: any[] = [];

  if (onRewardInsert) {
    const insertChannel = supabase
      .channel('keeper-rewards-inserts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'keeper_rewards' },
        (payload) => {
          console.log('[Realtime] New keeper reward:', payload);
          onRewardInsert(payload);
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Keeper rewards INSERT subscription:', status);
      });
    channels.push(insertChannel);
  }

  if (onRewardUpdate) {
    const updateChannel = supabase
      .channel('keeper-rewards-updates')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'keeper_rewards' },
        (payload) => {
          console.log('[Realtime] Keeper reward updated:', payload);
          onRewardUpdate(payload);
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Keeper rewards UPDATE subscription:', status);
      });
    channels.push(updateChannel);
  }

  return () => {
    channels.forEach(channel => supabase.removeChannel(channel));
    console.log('[Realtime] Unsubscribed from keeper rewards');
  };
}

/**
 * Get current auth session
 */
export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error('[Supabase] Failed to get session:', error);
    return null;
  }
  return data?.session || null;
}

/**
 * Get auth token for API requests
 */
export async function getAuthToken(): Promise<string | null> {
  const session = await getCurrentSession();
  return session?.access_token || null;
}

export default supabase;

/**
 * Create a mock Supabase client when credentials are invalid
 * This prevents 401 errors in the console
 */
function createMockSupabase(): any {
  console.log('🔧 [Supabase] Creating MOCK client (no realtime features)');
  
  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => ({
      select: () => ({
        order: () => ({
          limit: () => Promise.resolve({ data: [], error: null }),
        }),
        eq: () => Promise.resolve({ data: [], error: null }),
      }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => Promise.resolve({ data: null, error: null }),
      delete: () => Promise.resolve({ data: null, error: null }),
    }),
    channel: () => ({
      on: () => ({
        subscribe: () => {},
      }),
    }),
    removeChannel: () => {},
    removeAllChannels: () => {},
  };
}
