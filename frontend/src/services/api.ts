import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000/api",
  headers: {
    "Content-Type": "application/json"
  },
});

// this will attach the jwt for every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if(token){
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  }
);

// this will handle when the jwt expiration or invalid
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);


