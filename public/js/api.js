/**
 * Core API Wrapper for Advocate Website
 * Handles base URLs, secure cookies, and global error handling/toasts.
 */

const API_BASE_URL = window.location.origin + '/api';

// Simple Toast Notification System
const Toast = {
    show(message, type = 'success') {
        const toastContainer = document.getElementById('toast-container') || this.createContainer();
        const toast = document.createElement('div');
        
        const bgColors = {
            success: 'bg-green-600',
            error: 'bg-red-600',
            info: 'bg-blue-600'
        };

        toast.className = `${bgColors[type]} text-white px-6 py-3 rounded-lg shadow-lg mb-3 transform transition-all duration-300 translate-y-full opacity-0 flex items-center justify-between`;
        const span = document.createElement('span');
        span.textContent = message;
        const btn = document.createElement('button');
        btn.className = 'ml-4 text-white hover:text-gray-200';
        btn.innerHTML = '&times;';
        btn.onclick = () => toast.remove();
        toast.appendChild(span);
        toast.appendChild(btn);

        toastContainer.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.classList.remove('translate-y-full', 'opacity-0');
            toast.classList.add('translate-y-0', 'opacity-100');
        });

        // Auto remove after 5s
        setTimeout(() => {
            toast.classList.remove('translate-y-0', 'opacity-100');
            toast.classList.add('translate-y-full', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    },

    createContainer() {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed bottom-4 right-4 z-50 flex flex-col items-end';
        document.body.appendChild(container);
        return container;
    }
};

const apiClient = async (endpoint, options = {}) => {
    try {
        const config = {
            ...options,
            headers: {
                ...options.headers
            },
            credentials: 'include',
            mode: 'cors'
        };

        if (config.body instanceof FormData) {
            // Let browser set Content-Type with boundary for FormData
        } else if (config.body) {
            config.headers['Content-Type'] = 'application/json';
            config.body = JSON.stringify(config.body);
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        
        let data;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            data = await response.json();
        } else {
            const text = await response.text();
            throw new Error(`Server Error (${response.status}): ${text.substring(0, 50)}...`);
        }

        if (!response.ok || data.success === false) {
            if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
                throw new Error(data.errors[0].msg || 'Validation failed');
            }
            throw new Error(data.error || 'Something went wrong');
        }

        return data;
    } catch (error) {
        console.error(`API Error (${endpoint}):`, error);
        
        // Show generic toast for network/server errors
        if (!options.silent) {
            Toast.show(error.message, 'error');
        }
        
        // Redirect to login if unauthorized
        if (error.message.includes('Authentication') || error.message.includes('Invalid or expired token')) {
            localStorage.removeItem('adminToken'); // Cleanup legacy tokens
            if (window.location.pathname !== '/admin.html') {
                window.location.href = '/admin.html';
            }
        }
        
        throw error;
    }
};

// API Helpers Map
const API = {
    // Auth
    login: (credentials) => apiClient('/auth/login', { method: 'POST', body: credentials }),
    logout: () => apiClient('/auth/logout', { method: 'POST' }),
    checkAuth: () => apiClient('/auth/me', { silent: true }),
    changeCredentials: (data) => apiClient('/auth/change-credentials', { method: 'PUT', body: data }),

    // Blogs
    getBlogs: (page = 1, limit = 10, search = '') => 
        apiClient(`/blogs?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`),
    getBlogById: (id) => apiClient(`/blogs/${id}`),
    createBlog: (formData) => apiClient('/blogs', { method: 'POST', body: formData }),
    updateBlog: (id, formData) => apiClient(`/blogs/${id}`, { method: 'PUT', body: formData }),
    deleteBlog: (id) => apiClient(`/blogs/${id}`, { method: 'DELETE' }),

    // Bookings
    getBookings: () => apiClient('/bookings'),
    createBooking: (data) => apiClient('/bookings', { method: 'POST', body: data }),
    updateBookingStatus: (id, status) => apiClient(`/bookings/${id}/status`, { method: 'PUT', body: { status } }),
    deleteBooking: (id) => apiClient(`/bookings/${id}`, { method: 'DELETE' }),

    // Content
    getContent: () => apiClient('/website-content'),
    createContent: (formData) => apiClient('/website-content', { method: 'POST', body: formData }),
    updateContent: (id, formData) => apiClient(`/website-content/${id}`, { method: 'PUT', body: formData }),
    saveFooterContent: (data) => apiClient('/website-content/footer', { method: 'POST', body: data }),
    updateContentBulk: (page, sections) => apiClient('/website-content/bulk', { method: 'POST', body: { page, sections } }),
    deleteContentBulk: (page, sections) => apiClient('/website-content/bulk-delete', { method: 'POST', body: { page, sections } }),

    // Revisions & Undo
    getRevisions: (page, section) => apiClient(`/website-content/revisions/${encodeURIComponent(page)}/${encodeURIComponent(section)}`),
    getAllRevisions: () => apiClient('/website-content/revisions'),
    undoContent: (revisionId) => apiClient('/website-content/undo', { method: 'POST', body: { revisionId } }),

    
    getAnnouncements: (all) => apiClient(`/announcements${all ? '?all=1' : ''}`),
    createAnnouncement: (data) => apiClient('/announcements', { method: 'POST', body: data }),
    updateAnnouncement: (id, data) => apiClient(`/announcements/${id}`, { method: 'PUT', body: data }),
    deleteAnnouncement: (id) => apiClient(`/announcements/${id}`, { method: 'DELETE' }),

    // Team Members
    getTeamMembers: () => apiClient('/team-members'),
    createTeamMember: (formData) => apiClient('/team-members', { method: 'POST', body: formData }),
    updateTeamMember: (id, formData) => apiClient(`/team-members/${id}`, { method: 'PUT', body: formData }),
    deleteTeamMember: (id) => apiClient(`/team-members/${id}`, { method: 'DELETE' }),

    // Booking
    lookupBooking: (email, date) => apiClient(`/bookings/lookup?email=${encodeURIComponent(email)}&date=${encodeURIComponent(date)}`),
    cancelBooking: (id) => apiClient('/bookings/cancel', { method: 'PUT', body: { id } }),

    // Contacts
    getContacts: () => apiClient('/contacts'),
    createContact: (data) => apiClient('/contacts', { method: 'POST', body: data }),
    deleteContact: (id) => apiClient(`/contacts/${id}`, { method: 'DELETE' }),

    // Reports
    downloadReport: (data) => apiClient('/reports/download-request', { method: 'POST', body: data }),

    // Home Page
    getHomePage: () => apiClient('/website-content/admin/home'),
    updateHomePage: (formData) => apiClient('/website-content/admin/home/update', { method: 'POST', body: formData })
};

// Expose globally
window.API = API;
window.Toast = Toast;
