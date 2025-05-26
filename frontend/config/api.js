// API Configuration
// This file centralizes all API-related configuration

import { API_BASE_URL as ENV_API_BASE_URL } from '@env';

const getApiBaseUrl = () => {
  // Use environment variable from .env file
  if (ENV_API_BASE_URL) {
    return ENV_API_BASE_URL;
  }
  
  // Fallback to default (your current URL)
  return 'http://192.168.0.129:8000/v1';
};

export const API_BASE_URL = getApiBaseUrl();

// Export other API-related constants if needed
export const API_ENDPOINTS = {
  // Auth endpoints
  LOGIN: '/login',
  REGISTER: '/register',
  CHANGE_PASSWORD: '/change-password',
  PROFILE: '/profile',
  
  // Round endpoints
  ROUNDS: '/rounds',
  ROUNDS_START: '/rounds/start',
  ROUNDS_ACTIVE: '/rounds/active',
  ROUNDS_HISTORY: '/rounds/history',
  
  // Club endpoints
  CLUBS: '/clubs',
  
  // AI endpoints
  AGENT_QUERY: '/agent/query',
  SHOTS_FEEDBACK: '/shots/feedback'
};

// Helper function to build full API URLs
export const buildApiUrl = (endpoint) => {
  return `${API_BASE_URL}${endpoint}`;
};

export default {
  API_BASE_URL,
  API_ENDPOINTS,
  buildApiUrl
}; 