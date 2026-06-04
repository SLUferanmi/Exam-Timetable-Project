import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/',
});

// Attach access token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access');
    if (token && !config.url.includes('auth/login') && !config.url.includes('auth/refresh')) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Attempt automatic 401 token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        
        // Check for 401 and prevent infinite loop if refresh itself fails
        if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes('auth/')) {
            originalRequest._retry = true;
            
            try {
                const refresh = localStorage.getItem('refresh');
                if (!refresh) throw new Error('No refresh token available');
                
                const res = await axios.post(`${api.defaults.baseURL}auth/refresh/`, { refresh });
                
                const newAccess = res.data.access;
                localStorage.setItem('access', newAccess);
                
                // If simplejwt ROTATE_REFRESH_TOKENS is on, it might give us a new refresh token
                if (res.data.refresh) {
                    localStorage.setItem('refresh', res.data.refresh);
                }
                
                // Retry the original request with the new token
                originalRequest.headers.Authorization = `Bearer ${newAccess}`;
                return api(originalRequest);
                
            } catch (refreshError) {
                // Refresh token invalid or expired. Force a secure hard logout.
                localStorage.removeItem('access');
                localStorage.removeItem('refresh');
                localStorage.removeItem('user');
                window.location.href = '/'; 
                return Promise.reject(refreshError);
            }
        }
        
        return Promise.reject(error);
    }
);

export default api;
