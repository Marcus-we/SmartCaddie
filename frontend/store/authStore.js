import { create } from "zustand";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { API_BASE_URL } from '../config/api';

const API_URL = API_BASE_URL; // Use centralized API URL

const loadInitialState = async () => {
  try {
    const token = await AsyncStorage.getItem("token");
    const userData = await AsyncStorage.getItem("userData");
    
    return { 
      token: token || null, 
      userData: userData ? JSON.parse(userData) : null 
    };
  } catch (error) {
    console.error('Error loading initial state:', error);
    return { token: null, userData: null };
  }
};

const authStore = create((set, get) => ({
  token: null,
  userData: null,
  isLoading: true,
  
  // Initialize the store with data from AsyncStorage
  initialize: async () => {
    const initialState = await loadInitialState();
    set({ ...initialState, isLoading: false });
  },

  setToken: async (token) => {
    try {
      await AsyncStorage.setItem("token", token);
      set(() => ({ token }));
    } catch (error) {
      console.error('Error saving token:', error);
    }
  },

  logout: async () => {
    const { token } = get();
    
    try {
      // Call backend logout endpoint
      if (token) {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout API call failed:', error);
    }

    try {
      // Clear AsyncStorage
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("userData");
      
      set(() => ({
        token: null,
        userData: null,
      }));
      
      // Redirect to homepage
      router.replace('/');
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  },

  setUserData: async (userData) => {
    try {
      await AsyncStorage.setItem("userData", JSON.stringify(userData));
      set(() => ({ userData }));
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  },

  fetchUser: async () => {
    const { token, logout, setUserData } = get();
    
    if (!token) {
      console.log('No token available');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 200) {
        const userData = await response.json();
        await setUserData(userData);
        console.log('User data fetched:', userData);
      } else if (response.status === 401) {
        console.log('Token expired, logging out');
        await logout();
      } else {
        console.error("Failed to fetch user data");
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  },
}));

export default authStore;