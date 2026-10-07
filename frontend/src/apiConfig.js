/**
 * NanoVision API Configuration
 * Supports local Vite proxy as well as cloud-hosted backends (Render, Railway, Fly.io, etc.)
 */
const rawBase = import.meta.env.VITE_API_URL || '';
export const API_BASE = rawBase.replace(/\/+$/, '');

/**
 * Returns full URL for an API endpoint path (e.g., '/api/health')
 * @param {string} path 
 * @returns {string}
 */
export const apiUrl = (path) => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${cleanPath}`;
};
