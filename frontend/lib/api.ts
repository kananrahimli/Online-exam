import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized
      if (typeof window !== "undefined") {
        const currentPath = window.location.pathname;
        const isCreatePage = currentPath.includes("/exams/create");
        const isEditPage = currentPath.includes("/exams/") && currentPath.includes("/edit");
        
        // On create/edit pages, DO NOT redirect or clear storage
        // Let the page handle the error and show message to user
        if (isCreatePage || isEditPage) {
          // Do nothing - let the page handle it
          return Promise.reject(error);
        }
        
        // For all other pages, clear storage and redirect
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        // Only redirect if not already on login page
        if (currentPath !== "/login") {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
