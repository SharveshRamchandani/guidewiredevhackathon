const axios = require('axios');

const mlClient = axios.create({
  baseURL: process.env.ML_BASE_URL || 'http://localhost:8000',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor – log outgoing calls in dev
mlClient.interceptors.request.use((config) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[ML] → ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
  }
  return config;
});

// Response interceptor – surface ML errors clearly
mlClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const msg = error.response?.data?.detail || error.message;
    console.error(`[ML] ✗ ${error.config?.url} – ${msg}`);
    return Promise.reject(new Error(`ML service error: ${msg}`));
  }
);

module.exports = mlClient;
