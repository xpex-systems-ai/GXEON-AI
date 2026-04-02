// API Configuration for production and development
const API_BASE = (import.meta as any).env?.VITE_API_URL || '';

export { API_BASE };
