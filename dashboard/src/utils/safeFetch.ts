// Safe fetch polyfill and utility
// This ensures fetch is always available even in older browsers

// Check if fetch exists globally
const getFetch = (): typeof fetch => {
  if (typeof window !== 'undefined' && window.fetch) {
    return window.fetch.bind(window);
  }
  if (typeof globalThis !== 'undefined' && globalThis.fetch) {
    return globalThis.fetch.bind(globalThis);
  }
  if (typeof fetch !== 'undefined') {
    return fetch;
  }
  
  // Return a mock fetch that returns an error response
  return () => {
    console.error('[SafeFetch] Fetch API not available');
    return Promise.resolve({
      ok: false,
      status: 503,
      statusText: 'Fetch API not available',
      json: () => Promise.resolve({ error: 'Fetch API not available' }),
      text: () => Promise.resolve('Fetch API not available'),
      headers: new Headers(),
      url: '',
      type: 'error' as ResponseType,
      redirected: false,
      body: null,
      bodyUsed: false,
      clone: function() { return this as Response; },
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      blob: () => Promise.resolve(new Blob()),
      formData: () => Promise.resolve(new FormData()),
    } as Response);
  };
};

// Export safe fetch function
export const safeFetch = getFetch();

// Export API base configuration
export const API_BASE = 'https://gxeon-xpex-production.up.railway.app';

// Safe fetch wrapper with error handling
export async function safeFetchWrapper<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  try {
    const fetchFn = getFetch();
    const response = await fetchFn(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response || !response.ok) {
      console.warn(`[SafeFetch] Response invalid for ${url}:`, response?.status);
      return {} as T;
    }

    const data = await response.json();
    return data || ({} as T);
  } catch (error) {
    console.error(`[SafeFetch] Error for ${url}:`, error);
    return {} as T;
  }
}
