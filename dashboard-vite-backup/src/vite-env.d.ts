/// <reference types="vite/client" />

interface Window {
  ethereum?: {
    isMetaMask?: boolean;
    request: (request: { method: string; params?: Array<unknown> }) => Promise<unknown>;
    on: (event: string, callback: (accounts: string[]) => void) => void;
    removeListener: (event: string, callback: (accounts: string[]) => void) => void;
    removeAllListeners: (event: string) => void;
    listAccounts: () => Promise<string[]>;
    send: (method: string, params?: Array<unknown>) => Promise<unknown>;
  };
}
