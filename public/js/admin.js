document.addEventListener('DOMContentLoaded', async function() {
    // Check auth on load using HttpOnly cookie (handled by API wrapper)
    try {
        await API.checkAuth();
        showAdminSection();
    } catch (err) {
        showLoginSection();
    }
});

function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        const submitBtn = this.querySelector('button[type="submit"]');
        const messageDiv = document.getElementById('loginMessage');
        
        // Loading state
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="animate-pulse">Authenticating...</span>';
        submitBtn.disabled = true;
        messageDiv.innerHTML = '';

        try {
            const result = await API.login({
                username: usernameInput.value,
                password: passwordInput.value
            });
            Toast.show('Login successful', 'success');
            showAdminSection();
        } catch (err) {
            console.error('Login error:', err);
            messageDiv.innerHTML = `<div class="text-red-500 font-medium p-3 bg-red-50 rounded">${escapeHtml(err.message)}</div>`;
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}

async function logout() {
    try {
        await API.logout();
        Toast.show('Logged out successfully', 'info');
        showLoginSection();
    } catch (err) {
        console.error('Logout failed', err);
    }
}

function showAdminSection() {
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('adminSection').classList.remove('hidden');
    loadAdminData();
}

function showLoginSection() {
    document.getElementById('loginSection').classList.remove('hidden');
    document.getElementById('adminSection').classList.add('hidden');
    // Clear legacy tokens if they exist
    localStorage.removeItem('adminToken');
}

async function loadAdminData() {
    await Promise.all([
        loadBlogs(),
        loadBookings()
    ]);
}

async function loadBlogs() {
    try {
        const response = await API.getBlogs(1, 100);
        const tbody = document.getElementById('blogsList');
        if (!tbody) return;

        if (response.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-gray-500">No blog posts found</td></tr>';
            return;
        }

        tbody.innerHTML = response.data.map(blog => `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="px-6 py-4 font-medium text-slate-900">${escapeHtml(blog.title)}</td>
                <td class="px-6 py-4">${escapeHtml(blog.author)}</td>
                <td class="px-6 py-4">${new Date(blog.created_at).toLocaleDateString()}</td>
                <td class="px-6 py-4 text-center">
                    <button onclick="editBlog(${blog.id})" class="text-blue-600 hover:text-blue-800 font-medium mr-3">Edit</button>
                    <button onclick="deleteBlog(${blog.id})" class="text-red-600 hover:text-red-800 font-medium">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        // Error handled by API wrapper
    }
}

async function loadBookings() {
    try {
        const response = await API.getBookings();
        const tbody = document.getElementById('bookingsList');
        if (!tbody) return;

        let data = response.data || [];

        const dateFilter = document.getElementById('bookingDateFilter')?.value;
        const sortOrder = document.getElementById('bookingSortOrder')?.value || 'newest';
        const statusFilter = document.getElementById('bookingStatusFilter')?.value;

        if (dateFilter) {
            data = data.filter(b => b.date === dateFilter);
        }
        if (statusFilter) {
            data = data.filter(b => b.status === statusFilter);
        }

        data.sort((a, b) => {
            if (sortOrder === 'newest') return new Date(b.created_at) - new Date(a.created_at);
            if (sortOrder === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
            if (sortOrder === 'date-asc') return new Date(a.date) - new Date(b.date);
            if (sortOrder === 'date-desc') return new Date(b.date) - new Date(a.date);
            return 0;
        });

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-500">No bookings found</td></tr>';
            return;
        }

        const statusBadge = (status) => {
            const map = {
                pending: 'bg-amber-100 text-amber-800',
                confirmed: 'bg-blue-100 text-blue-800',
                completed: 'bg-green-100 text-green-800',
                cancelled: 'bg-red-100 text-red-800'
            };
            return `<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${map[status] || map.pending}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>`;
        };

        tbody.innerHTML = data.map((booking, idx) => `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="px-4 py-4">
                    <div class="font-medium text-slate-900">${escapeHtml(booking.name)}</div>
                    <div class="text-xs text-slate-500">${escapeHtml(booking.email)}</div>
                    <div class="text-xs text-slate-400">${escapeHtml(booking.phone)}</div>
                </td>
                <td class="px-4 py-4 text-sm text-slate-700">${escapeHtml(booking.service)}</td>
                <td class="px-4 py-4">
                    <div class="text-sm font-medium text-slate-800">${escapeHtml(booking.date)}</div>
                    <div class="text-xs text-slate-500">${escapeHtml(booking.time)}</div>
                </td>
                <td class="px-4 py-4 text-xs text-slate-500">${new Date(booking.created_at).toLocaleDateString()} <span class="text-slate-400">${new Date(booking.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span></td>
                <td class="px-4 py-4 text-center">${statusBadge(booking.status)}</td>
                <td class="px-4 py-4 text-center">
                    <button onclick="openBookingDetail(${idx})" class="text-navy hover:text-slate-600 font-medium text-sm">View</button>
                    <button onclick="deleteBooking(${booking.id}, ${idx})" class="text-red-600 hover:text-red-800 font-medium text-sm ml-2">Delete</button>
                </td>
            </tr>
        `).join('');

        window._bookingsCache = data;
    } catch (err) {
        console.error(err);
    }
}

let currentBookingId = null;

function openBookingDetail(idx) {
    const booking = window._bookingsCache?.[idx];
    if (!booking) return;
    viewBookingDetails(booking.id, booking.name, booking.email, booking.phone, booking.service, booking.date, booking.time, booking.status, booking.message, booking.created_at);
}

document.getElementById('bookingDateFilter')?.addEventListener('change', loadBookings);
document.getElementById('bookingSortOrder')?.addEventListener('change', loadBookings);
document.getElementById('bookingStatusFilter')?.addEventListener('change', loadBookings);
document.getElementById('inquiryDateFilter')?.addEventListener('change', loadContacts);
document.getElementById('inquirySortOrder')?.addEventListener('change', loadContacts);

function viewBookingDetails(id, name, email, phone, service, date, time, status, message, createdAt) {
    currentBookingId = id;
    document.getElementById('booking-detail-name').textContent = name || 'N/A';
    document.getElementById('booking-detail-email').textContent = email || 'N/A';
    document.getElementById('booking-detail-phone').textContent = phone || 'N/A';
    document.getElementById('booking-detail-service').textContent = service || 'N/A';
    document.getElementById('booking-detail-datetime').textContent = (date || 'N/A') + ' at ' + (time || '');
    document.getElementById('booking-detail-message').textContent = message || 'No case details provided';
    const created = createdAt ? new Date(createdAt) : null;
    const createdStr = created ? created.toLocaleDateString() + ' ' + created.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : 'N/A';
    document.getElementById('booking-detail-booked-on').textContent = createdStr;

    const statusEl = document.getElementById('booking-detail-status');
    const statusMap = {
        pending: { text: 'Pending', cls: 'bg-amber-100 text-amber-800' },
        confirmed: { text: 'Confirmed', cls: 'bg-blue-100 text-blue-800' },
        completed: { text: 'Completed', cls: 'bg-green-100 text-green-800' },
        cancelled: { text: 'Cancelled', cls: 'bg-red-100 text-red-800' }
    };
    const st = statusMap[status] || statusMap.pending;
    statusEl.textContent = st.text;
    statusEl.className = `mt-1 font-semibold inline-flex items-center px-3 py-1 rounded-full text-xs ${st.cls}`;

    const headerMap = {
        pending: 'bg-amber-600',
        confirmed: 'bg-blue-600',
        completed: 'bg-green-600',
        cancelled: 'bg-red-600'
    };
    document.getElementById('booking-modal-header').className = `px-6 py-4 rounded-t-2xl flex justify-between items-center ${headerMap[status] || 'bg-navy'}`;

    document.getElementById('booking-status-select').value = status;
    document.getElementById('bookingDetailModal').classList.remove('hidden');
}

function closeBookingDetail() {
    document.getElementById('bookingDetailModal').classList.add('hidden');
    currentBookingId = null;
}

async function saveBookingStatusFromModal() {
    if (!currentBookingId) return;
    const status = document.getElementById('booking-status-select').value;
    try {
        await API.updateBookingStatus(currentBookingId, status);
        Toast.show('Booking status updated', 'success');

        // Update cache and DOM row without reloading everything
        const cache = window._bookingsCache || [];
        const idx = cache.findIndex(b => b.id === currentBookingId);
        if (idx !== -1) {
            cache[idx].status = status;
            const rows = document.querySelectorAll('#bookingsList tr');
            const row = rows[idx];
            if (row) {
                const badgeMap = {
                    pending: 'bg-amber-100 text-amber-800',
                    confirmed: 'bg-blue-100 text-blue-800',
                    completed: 'bg-green-100 text-green-800',
                    cancelled: 'bg-red-100 text-red-800'
                };
                const cells = row.cells;
                if (cells[4]) {
                    cells[4].innerHTML = `<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${badgeMap[status] || badgeMap.pending}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>`;
                }
            }
        }

        closeBookingDetail();
    } catch (err) {
        console.error(err);
    }
}

async function deleteBooking(id, idx) {
    if (!confirm('Delete this booking?')) return;
    try {
        await API.deleteBooking(id);
        Toast.show('Booking deleted', 'success');
        // Remove row from DOM and cache
        const rows = document.querySelectorAll('#bookingsList tr');
        if (rows[idx]) rows[idx].remove();
        const cache = window._bookingsCache || [];
        cache.splice(idx, 1);
    } catch (err) {
        console.error(err);
    }
}

// Settings - Change Credentials
async function saveCredentials() {
    const username = document.getElementById('settingsUsername').value;
    const password = document.getElementById('settingsPassword').value;
    const msgDiv = document.getElementById('settingsMessage');

    if (!username || !password) {
        msgDiv.innerHTML = '<div class="text-red-500 font-medium p-3 bg-red-50 rounded">Both fields are required</div>';
        return;
    }
    if (password.length < 6) {
        msgDiv.innerHTML = '<div class="text-red-500 font-medium p-3 bg-red-50 rounded">Password must be at least 6 characters</div>';
        return;
    }

    try {
        await API.changeCredentials({ username, password });
        msgDiv.innerHTML = '<div class="text-green-500 font-medium p-3 bg-green-50 rounded">Credentials saved! Logging out...</div>';
        setTimeout(() => {
            API.logout().then(() => window.location.reload()).catch(() => window.location.reload());
        }, 1500);
    } catch (err) {
        msgDiv.innerHTML = `<div class="text-red-500 font-medium p-3 bg-red-50 rounded">${escapeHtml(err.message)}</div>`;
    }
}

// Blog Management Functions
const blogFormElement = document.getElementById('blogFormElement');
if (blogFormElement) {
    blogFormElement.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const id = document.getElementById('blogId').value;
        const formData = new FormData();
        formData.append('title', document.getElementById('blogTitle').value);
        formData.append('author', document.getElementById('blogAuthor').value);
        formData.append('content', document.getElementById('blogContent').value);
        
        const imageFile = document.getElementById('blogImage').files[0];
        if (imageFile) {
            formData.append('image', imageFile);
        }

        const submitBtn = this.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="animate-pulse">Saving...</span>';
        submitBtn.disabled = true;

        try {
            if (id) {
                await API.updateBlog(id, formData);
                Toast.show('Blog updated successfully', 'success');
            } else {
                await API.createBlog(formData);
                Toast.show('Blog created successfully', 'success');
            }
            
            cancelForm();
            loadBlogs();
        } catch (err) {
            // Error handled by API wrapper
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}

function showCreateForm() {
    document.getElementById('blogForm').classList.remove('hidden');
    document.getElementById('formTitle').textContent = 'Create New Blog Post';
    document.getElementById('blogFormElement').reset();
    document.getElementById('blogId').value = '';
    document.getElementById('imagePreview').classList.add('hidden');
}

function cancelForm() {
    document.getElementById('blogForm').classList.add('hidden');
    document.getElementById('blogFormElement').reset();
}

async function editBlog(id) {
    try {
        const response = await API.getBlogById(id);
        const blog = response.data;
        
        document.getElementById('blogForm').classList.remove('hidden');
        document.getElementById('formTitle').textContent = 'Edit Blog Post';
        
        document.getElementById('blogId').value = blog.id;
        document.getElementById('blogTitle').value = blog.title;
        document.getElementById('blogAuthor').value = blog.author;
        document.getElementById('blogContent').value = blog.content;
        
        if (blog.image) {
            const preview = document.getElementById('imagePreview');
            preview.src = blog.image;
            preview.classList.remove('hidden');
        }
        
        // Scroll to form
        document.getElementById('blogForm').scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
        // Error handled by wrapper
    }
}

async function deleteBlog(id) {
    if (confirm('Are you sure you want to delete this blog post?')) {
        try {
            await API.deleteBlog(id);
            Toast.show('Blog deleted successfully', 'success');
            loadBlogs();
        } catch (err) {
            // Error handled by wrapper
        }
    }
}

// Tab Navigation
function showTab(tabName) {
    // Hide all panels
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.add('hidden'));
    // Show selected panel
    document.getElementById('panel-' + tabName).classList.remove('hidden');
    
    // Update tab styling
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('tab-active', 'text-navy');
        btn.classList.add('text-gray-400');
    });
    const activeTab = document.getElementById('tab-' + tabName);
    activeTab.classList.add('tab-active', 'text-navy');
    activeTab.classList.remove('text-gray-400');
    
// Load data for the tab
    if (tabName === 'home') {
        loadHomePageData();
        loadHomeStats();
    }
    else if (tabName === 'about') {
        loadAboutPageContent();
        loadCoreValues();
        loadBookingNotes();
        loadTeamMembers();
    }
    else if (tabName === 'services') {
        loadServicesContent();
    }
    else if (tabName === 'inquiries') {
        loadContacts();
    }
    else if (tabName === 'contact-page') {
        loadContactContent();
        loadContactOfficeDetails();
    }
    
    else if (tabName === 'calculator') loadCalculatorContent();
    else if (tabName === 'footer') loadFooterSettings();
    else if (tabName === 'announcements') loadAnnouncements();
    else if (tabName === 'blogs') loadBlogs();
    else if (tabName === 'bookings') loadBookings();
}

// Announcements
async function loadAnnouncements() {
    try {
        const response = await API.getAnnouncements(true);
        const tbody = document.getElementById('announcementList');
        if (!tbody) return;
        
        if (response.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-gray-500">No announcements found</td></tr>';
            return;
        }
        
        tbody.innerHTML = response.data.map(ann => `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="px-6 py-4 font-medium text-slate-900">${escapeHtml(ann.title)}</td>
                <td class="px-6 py-4"><span class="bg-gray-100 px-2 py-1 rounded text-xs">${escapeHtml(ann.type)}</span></td>
                <td class="px-6 py-4">${escapeHtml(ann.content.substring(0, 50))}...</td>
                <td class="px-6 py-4 text-center">${ann.is_active ? '<span class="bg-green-100 text-green-800 px-2 py-1 rounded">Active</span>' : '<span class="bg-gray-100 text-gray-600 px-2 py-1 rounded">Inactive</span>'}</td>
                <td class="px-6 py-4 text-center">
                    <button onclick="editAnnouncement(${ann.id})" class="text-blue-600 hover:text-blue-800 font-medium mr-3">Edit</button>
                    <button onclick="deleteAnnouncement(${ann.id})" class="text-red-600 hover:text-red-800 font-medium">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error(err);
    }
}

function showAnnouncementForm(id = null) {
    const form = document.getElementById('announcementForm');
    const title = document.getElementById('announcementFormTitle');
    form.classList.remove('hidden');
    title.textContent = id ? 'Edit Announcement' : 'Create Announcement';
    document.getElementById('announcementId').value = id || '';
    if (!id) document.getElementById('announcementFormElement').reset();
}

function cancelAnnouncementForm() {
    document.getElementById('announcementForm').classList.add('hidden');
    document.getElementById('announcementFormElement').reset();
}

const announcementFormElement = document.getElementById('announcementFormElement');
if (announcementFormElement) {
    announcementFormElement.addEventListener('submit', async function(e) {
        e.preventDefault();
        const id = document.getElementById('announcementId').value;
        const data = {
            title: document.getElementById('announcementTitle').value,
            content: document.getElementById('announcementContent').value,
            type: document.getElementById('announcementType').value,
            is_active: document.getElementById('announcementActive').checked ? 1 : 0
        };
        
        try {
            if (id) {
                await API.updateAnnouncement(id, data);
                Toast.show('Announcement updated', 'success');
            } else {
                await API.createAnnouncement(data);
                Toast.show('Announcement created', 'success');
            }
            cancelAnnouncementForm();
            loadAnnouncements();
        } catch (err) {
            console.error(err);
        }
    });
}

async function editAnnouncement(id) {
    try {
        const response = await API.getAnnouncements(true);
        const ann = response.data.find(a => a.id === id);
        if (ann) {
            showAnnouncementForm(id);
            document.getElementById('announcementTitle').value = ann.title;
            document.getElementById('announcementContent').value = ann.content;
            document.getElementById('announcementType').value = ann.type;
            document.getElementById('announcementActive').checked = ann.is_active;
        }
    } catch (err) {
        console.error(err);
    }
}

async function deleteAnnouncement(id) {
    if (confirm('Delete this announcement?')) {
        try {
            await API.deleteAnnouncement(id);
            Toast.show('Announcement deleted', 'success');
            loadAnnouncements();
        } catch (err) {
            console.error(err);
        }
    }
}

// Footer Settings
async function loadFooterSettings() {
    try {
        const response = await API.getContent();
        const content = response.data;
        
        const footerAddress = content.find(c => c.section === 'footer-address');
        const footerPhone = content.find(c => c.section === 'footer-phone');
        const footerEmail = content.find(c => c.section === 'footer-email');
        const footerHours = content.find(c => c.section === 'footer-hours');
        const footerDescription = content.find(c => c.section === 'footer-description');
        
        if (footerAddress) document.getElementById('footerAddress').value = footerAddress.content;
        if (footerPhone) document.getElementById('footerPhone').value = footerPhone.content;
        if (footerEmail) document.getElementById('footerEmail').value = footerEmail.content;
        if (footerHours) document.getElementById('footerHours').value = footerHours.content;
        if (footerDescription) document.getElementById('footerDescription').value = footerDescription.content;
    } catch (err) {
        console.error(err);
    }
}

async function saveFooterSettings() {
    try {
        const footerData = [
            { section: 'footer-address', content: document.getElementById('footerAddress').value, page: 'global', type: 'text' },
            { section: 'footer-phone', content: document.getElementById('footerPhone').value, page: 'global', type: 'text' },
            { section: 'footer-email', content: document.getElementById('footerEmail').value, page: 'global', type: 'text' },
            { section: 'footer-hours', content: document.getElementById('footerHours').value, page: 'global', type: 'text' },
            { section: 'footer-description', content: document.getElementById('footerDescription').value, page: 'global', type: 'text' }
        ];
        
        for (const item of footerData) {
            await API.saveFooterContent(item);
        }
        
        Toast.show('Footer settings saved', 'success');
    } catch (err) {
        console.error(err);
    }
}

// Contacts Management
async function loadContacts() {
    try {
        const response = await API.getContacts();
        const tbody = document.getElementById('contactsList');
        if (!tbody) return;

        let data = response.data || [];

        const dateFilter = document.getElementById('inquiryDateFilter')?.value;
        const sortOrder = document.getElementById('inquirySortOrder')?.value || 'newest';

        if (dateFilter) {
            data = data.filter(c => {
                const d = new Date(c.created_at).toISOString().split('T')[0];
                return d === dateFilter;
    });
}

        data.sort((a, b) => {
            if (sortOrder === 'newest') return new Date(b.created_at) - new Date(a.created_at);
            if (sortOrder === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
            return 0;
        });

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-500">No contact submissions found</td></tr>';
            return;
        }

        tbody.innerHTML = data.map((contact, idx) => `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="px-6 py-4 font-medium text-slate-900">${escapeHtml(contact.name)}</td>
                <td class="px-6 py-4">
                    <div class="text-sm">${escapeHtml(contact.email)}</div>
                    <div class="text-xs text-slate-500">${escapeHtml(contact.phone) || '-'}</div>
                </td>
                <td class="px-6 py-4">
                    <span class="status-badge status-pending">${escapeHtml(contact.subject) || 'General'}</span>
                </td>
                <td class="px-6 py-4 max-w-xs truncate text-sm text-slate-600">${escapeHtml(contact.message) || '-'}</td>
                <td class="px-6 py-4 text-sm text-slate-500">${new Date(contact.created_at).toLocaleDateString()}</td>
                <td class="px-4 py-4 text-center">
                    <button onclick="openContactDetail(${idx})" class="text-navy hover:text-slate-600 font-medium text-sm">View</button>
                    <button onclick="deleteContact(${contact.id})" class="text-red-600 hover:text-red-800 font-medium text-sm ml-3">Delete</button>
                </td>
            </tr>
        `).join('');

        window._contactsCache = data;
    } catch (err) {
        console.error(err);
    }
}

// ==========================================
// CONTENT REVISION HISTORY & UNDO
// ==========================================

let undoPanelOpen = false;

function toggleUndoPanel() {
    const panel = document.getElementById('undoPanel');
    const btn = document.getElementById('undoToggleBtn');
    if (!panel) return;
    undoPanelOpen = !undoPanelOpen;
    panel.classList.toggle('hidden', !undoPanelOpen);
    if (undoPanelOpen) {
        btn.classList.add('ring-2', 'ring-yellow-500');
        refreshUndoPanel();
    } else {
        btn.classList.remove('ring-2', 'ring-gold');
    }
}

async function refreshUndoPanel() {
    const list = document.getElementById('undoList');
    if (!list) return;
    try {
        const response = await API.getAllRevisions();
        const revisions = response.data || [];
        if (revisions.length === 0) {
            list.innerHTML = '<div class="text-center text-gray-400 py-8">No revisions available</div>';
            return;
        }
        list.innerHTML = revisions.map(rev => {
            const time = new Date(rev.created_at);
            const timeStr = time.toLocaleDateString() + ' ' + time.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
            const label = rev.old_content
                ? (escapeHtml(rev.old_content.substring(0, 60)) + (rev.old_content.length > 60 ? '...' : ''))
                : (rev.old_image ? 'Image: ' + escapeHtml(rev.old_image.split('/').pop()) : '(empty)');
            return `
                <div class="border border-gray-100 rounded-xl p-3 mb-2 hover:bg-gray-50 transition-colors">
                    <div class="flex items-start justify-between gap-2">
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 mb-1">
                                <span class="text-xs font-bold bg-navy text-white px-2 py-0.5 rounded">${escapeHtml(rev.page)}</span>
                                <span class="text-xs font-medium text-gray-500">${escapeHtml(rev.section)}</span>
                                <span class="text-xs text-gray-400 ml-auto">${timeStr}</span>
                            </div>
                            <p class="text-sm text-gray-700 truncate">${label}</p>
                        </div>
                        <button onclick="undoRevision(${rev.id})" class="shrink-0 bg-amber-100 hover:bg-amber-200 text-amber-800 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors">Undo</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        list.innerHTML = '<div class="text-center text-red-500 py-8">Failed to load revisions</div>';
    }
}

async function undoRevision(id) {
    if (!confirm('Restore this previous version? Current content will be saved as a new revision.')) return;
    try {
        await API.undoContent(id);
        Toast.show('Content restored successfully', 'success');
        refreshUndoPanel();
        const activeTab = document.querySelector('.tab-btn.tab-active');
        if (activeTab) {
            const tabName = activeTab.id.replace('tab-', '');
            showTab(tabName);
        }
    } catch (err) {
        console.error(err);
        Toast.show('Error restoring revision', 'error');
    }
}

function openContactDetail(idx) {
    const contact = window._contactsCache?.[idx];
    if (!contact) return;
    document.getElementById('contact-detail-name').textContent = contact.name || 'N/A';
    document.getElementById('contact-detail-email').innerHTML = contact.email
        ? `<a href="mailto:${escapeHtml(contact.email)}" class="text-navy hover:underline">${escapeHtml(contact.email)}</a>`
        : 'N/A';
    document.getElementById('contact-detail-phone').textContent = contact.phone || 'N/A';
    document.getElementById('contact-detail-subject').textContent = contact.subject || 'General';
    document.getElementById('contact-detail-message').textContent = contact.message || 'No message provided';
    document.getElementById('contact-detail-date').textContent = new Date(contact.created_at).toLocaleString();
    document.getElementById('contactDetailModal').classList.remove('hidden');
}

function closeContactDetail() {
    document.getElementById('contactDetailModal').classList.add('hidden');
}

async function deleteContact(id) {
    if (confirm('Delete this contact submission?')) {
        try {
            await API.deleteContact(id);
            Toast.show('Contact deleted', 'success');
            loadContacts();
        } catch (err) {
            console.error(err);
        }
    }
}

// About Page Functions
async function loadAboutPageContent() {
    try {
        const response = await API.getContent();
        const content = response.data.filter(item => item.page === 'about');
        
        content.forEach(item => {
            if (item.section === 'image' && document.getElementById('aboutImageUrl')) {
                document.getElementById('aboutImageUrl').value = item.image || item.content || '';
            }
            if (item.section === 'story-title' && document.getElementById('aboutStoryTitle')) {
                document.getElementById('aboutStoryTitle').value = item.content || '';
            }
            if (item.section === 'story-para1' && document.getElementById('aboutStoryPara1')) {
                document.getElementById('aboutStoryPara1').value = item.content || '';
            }
            if (item.section === 'story-para2' && document.getElementById('aboutStoryPara2')) {
                document.getElementById('aboutStoryPara2').value = item.content || '';
            }
            if (item.section === 'mission-text' && document.getElementById('aboutMissionText')) {
                document.getElementById('aboutMissionText').value = item.content || '';
            }
            if (item.section.startsWith('expertise-title-') && document.getElementById(item.section)) {
                document.getElementById(item.section).value = item.content || '';
            }
            if (item.section.startsWith('expertise-desc-') && document.getElementById(item.section)) {
                document.getElementById(item.section).value = item.content || '';
            }
        });
    } catch (err) {
        console.error('Error loading about page content', err);
    }
}

async function saveAboutImage() {
    try {
        const url = document.getElementById('aboutImageUrl').value;
        const fileInput = document.getElementById('aboutImageUpload');
        const formData = new FormData();
        formData.append('page', 'about');
        formData.append('section', 'image');
        formData.append('content_type', 'image');
        
        if (fileInput.files[0]) {
            formData.append('image', fileInput.files[0]);
        } else if (url) {
            formData.append('content', url);
        }
        
        await API.createContent(formData);
        Toast.show('Image saved successfully', 'success');
    } catch (err) {
        console.error(err);
        Toast.show('Error saving image', 'error');
    }
}

async function saveAboutStory() {
    try {
        const sections = [
            { section: 'story-title', content: document.getElementById('aboutStoryTitle').value },
            { section: 'story-para1', content: document.getElementById('aboutStoryPara1').value },
            { section: 'story-para2', content: document.getElementById('aboutStoryPara2').value }
        ];
        
        for (const item of sections) {
            const formData = new FormData();
            formData.append('page', 'about');
            formData.append('section', item.section);
            formData.append('content_type', 'text');
            formData.append('content', item.content);
            await API.createContent(formData);
        }
        
        Toast.show('Story saved successfully', 'success');
    } catch (err) {
        console.error(err);
        Toast.show('Error saving story', 'error');
    }
}

async function saveAboutMission() {
    try {
        const formData = new FormData();
        formData.append('page', 'about');
        formData.append('section', 'mission-text');
        formData.append('content_type', 'text');
        formData.append('content', document.getElementById('aboutMissionText').value);
        
        await API.createContent(formData);
        Toast.show('Mission saved successfully', 'success');
    } catch (err) {
        console.error(err);
        Toast.show('Error saving mission', 'error');
    }
}

async function saveAboutExpertise() {
    try {
        for (let i = 1; i <= 4; i++) {
            const titleFormData = new FormData();
            titleFormData.append('page', 'about');
            titleFormData.append('section', 'expertise-title-' + i);
            titleFormData.append('content_type', 'text');
            titleFormData.append('content', document.getElementById('expertiseTitle' + i).value);
            await API.createContent(titleFormData);
            
            const descFormData = new FormData();
            descFormData.append('page', 'about');
            descFormData.append('section', 'expertise-desc-' + i);
            descFormData.append('content_type', 'text');
            descFormData.append('content', document.getElementById('expertiseDesc' + i).value);
            await API.createContent(descFormData);
        }
        
        Toast.show('Expertise saved successfully', 'success');
    } catch (err) {
        console.error(err);
        Toast.show('Error saving expertise', 'error');
    }
}

async function loadTeamMembers() {
    try {
        const response = await API.getTeamMembers();
        const tbody = document.getElementById('teamList');
        if (!tbody) return;
        
        if (response.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-gray-500">No team members found</td></tr>';
            return;
        }
        
        tbody.innerHTML = response.data.map(member => `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="px-6 py-4">
                    ${member.image ? `<img src="${member.image}" class="h-12 w-12 object-cover rounded-lg">` : '<div class="h-12 w-12 bg-gray-200 rounded-lg"></div>'}
                </td>
                <td class="px-6 py-4 font-medium text-slate-900">${escapeHtml(member.name)}</td>
                <td class="px-6 py-4">${escapeHtml(member.position)}</td>
                <td class="px-6 py-4 text-gray-500">${member.description ? escapeHtml(member.description.substring(0, 50)) + '...' : '-'}</td>
                <td class="px-6 py-4 text-center">
                    <button onclick="editTeamMember(${member.id})" class="text-blue-600 hover:text-blue-800 font-medium mr-3">Edit</button>
                    <button onclick="deleteTeamMember(${member.id})" class="text-red-600 hover:text-red-800 font-medium">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error(err);
    }
}

function showTeamForm(id = null) {
    const form = document.getElementById('teamForm');
    const title = document.getElementById('teamFormTitle');
    form.classList.remove('hidden');
    title.textContent = id ? 'Edit Team Member' : 'Add Team Member';
    document.getElementById('teamId').value = id || '';
    if (!id) document.getElementById('teamFormElement').reset();
}

function cancelTeamForm() {
    document.getElementById('teamForm').classList.add('hidden');
    document.getElementById('teamFormElement').reset();
}

const teamFormElement = document.getElementById('teamFormElement');
if (teamFormElement) {
    teamFormElement.addEventListener('submit', async function(e) {
        e.preventDefault();
        const id = document.getElementById('teamId').value;
        const formData = new FormData();
        formData.append('name', document.getElementById('teamName').value);
        formData.append('position', document.getElementById('teamPosition').value);
        formData.append('description', document.getElementById('teamDescription').value);
        
        const imageUrl = document.getElementById('teamImageUrl').value;
        const imageFile = document.getElementById('teamImageUpload').files[0];
        
        if (imageFile) {
            formData.append('image', imageFile);
        } else if (imageUrl) {
            formData.append('image', imageUrl);
        }
        
        try {
            if (id) {
                await API.updateTeamMember(id, formData);
                Toast.show('Team member updated', 'success');
            } else {
                await API.createTeamMember(formData);
                Toast.show('Team member added', 'success');
            }
            cancelTeamForm();
            loadTeamMembers();
        } catch (err) {
            console.error(err);
        }
    });
}

async function editTeamMember(id) {
    try {
        const response = await API.getTeamMembers();
        const member = response.data.find(m => m.id === id);
        if (member) {
            showTeamForm(id);
            document.getElementById('teamName').value = member.name;
            document.getElementById('teamPosition').value = member.position;
            document.getElementById('teamDescription').value = member.description || '';
            document.getElementById('teamImageUrl').value = member.image || '';
        }
    } catch (err) {
        console.error(err);
    }
}

async function deleteTeamMember(id) {
    if (confirm('Are you sure you want to delete this team member?')) {
        try {
            await API.deleteTeamMember(id);
            Toast.show('Team member deleted', 'success');
            loadTeamMembers();
        } catch (err) {
            console.error(err);
        }
    }
}

// ==========================================
// HOME PAGE MANAGEMENT
// ==========================================

async function loadHomePageData() {
    try {
        const response = await API.getHomePage();
        const data = response.data || {};

        const safeSet = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value || '';
        };

        safeSet('homeHeroTitle', data.heroTitle);
        safeSet('homeHeroTitle2', data.heroTitle2);
        safeSet('homeHeroSubtitle', data.heroSubtitle);
        safeSet('homeHeroImage', data.heroImage);
        safeSet('homeAboutImage', data.aboutImage);
        safeSet('homeAboutSnippet', data.aboutSnippet);
    } catch (err) {
        console.error('Error loading home page data', err);
    }
}

async function saveHomeHero() {
    const el = (id) => document.getElementById(id);
    try {
        const formData = new FormData();
        formData.append('heroTitle', el('homeHeroTitle')?.value || '');
        formData.append('heroTitle2', el('homeHeroTitle2')?.value || '');
        formData.append('heroSubtitle', el('homeHeroSubtitle')?.value || '');
        formData.append('heroImage', el('homeHeroImage')?.value || '');
        await API.updateHomePage(formData);
        Toast.show('Hero section saved successfully', 'success');
    } catch (err) {
        console.error(err);
        Toast.show('Error saving hero section', 'error');
    }
}

async function saveHomeAbout() {
    const el = (id) => document.getElementById(id);
    try {
        const payload = [];
        const snippet = el('homeAboutSnippet')?.value || '';
        if (snippet.trim()) {
            payload.push({ section: 'about-snippet', content: snippet });
        }
        const imgUrl = el('homeAboutImage')?.value || '';
        if (imgUrl.trim()) {
            payload.push({ section: 'about-image', content: imgUrl });
        }
        if (payload.length > 0) {
            await API.updateContentBulk('home', payload);
        }
        const fileInput = el('homeAboutImageUpload');
        if (fileInput?.files?.[0]) {
            const formData = new FormData();
            formData.append('page', 'home');
            formData.append('section', 'about-image');
            formData.append('content_type', 'image');
            formData.append('image', fileInput.files[0]);
            await API.createContent(formData);
        }
        Toast.show('About section saved successfully', 'success');
    } catch (err) {
        console.error(err);
        Toast.show('Error saving about section', 'error');
    }
}

async function saveHomeStats() {
    try {
        const stats = [
            { section: 'stat-1-value', content: document.getElementById('homeStat1Value')?.value || '' },
            { section: 'stat-1-label', content: document.getElementById('homeStat1Label')?.value || '' },
            { section: 'stat-2-value', content: document.getElementById('homeStat2Value')?.value || '' },
            { section: 'stat-2-label', content: document.getElementById('homeStat2Label')?.value || '' },
            { section: 'stat-3-value', content: document.getElementById('homeStat3Value')?.value || '' },
            { section: 'stat-3-label', content: document.getElementById('homeStat3Label')?.value || '' }
        ];
        await API.updateContentBulk('home', stats);
        Toast.show('Statistics saved successfully', 'success');
    } catch (err) {
        console.error(err);
        Toast.show('Error saving statistics', 'error');
    }
}

async function loadHomeStats() {
    try {
        const response = await API.getContent();
        const stats = response.data.filter(item => item.page === 'home' && item.section.startsWith('stat-'));
        stats.forEach(item => {
            if (item.section === 'stat-1-value' && document.getElementById('homeStat1Value')) {
                document.getElementById('homeStat1Value').value = item.content || '';
            }
            if (item.section === 'stat-1-label' && document.getElementById('homeStat1Label')) {
                document.getElementById('homeStat1Label').value = item.content || '';
            }
            if (item.section === 'stat-2-value' && document.getElementById('homeStat2Value')) {
                document.getElementById('homeStat2Value').value = item.content || '';
            }
            if (item.section === 'stat-2-label' && document.getElementById('homeStat2Label')) {
                document.getElementById('homeStat2Label').value = item.content || '';
            }
            if (item.section === 'stat-3-value' && document.getElementById('homeStat3Value')) {
                document.getElementById('homeStat3Value').value = item.content || '';
            }
            if (item.section === 'stat-3-label' && document.getElementById('homeStat3Label')) {
                document.getElementById('homeStat3Label').value = item.content || '';
            }
        });
    } catch (err) {
        console.error(err);
    }
}

// Core Values Management
async function loadCoreValues() {
    try {
        const response = await API.getContent();
        const content = response.data.filter(item => item.page === 'about' && item.section.startsWith('core-value-'));
        
        content.forEach(item => {
            if (item.section === 'core-value-1' && document.getElementById('coreValue1')) {
                document.getElementById('coreValue1').value = item.content || '';
            }
            if (item.section === 'core-value-2' && document.getElementById('coreValue2')) {
                document.getElementById('coreValue2').value = item.content || '';
            }
            if (item.section === 'core-value-3' && document.getElementById('coreValue3')) {
                document.getElementById('coreValue3').value = item.content || '';
            }
            if (item.section === 'core-value-4' && document.getElementById('coreValue4')) {
                document.getElementById('coreValue4').value = item.content || '';
            }
        });
    } catch (err) {
        console.error(err);
    }
}

async function saveCoreValues() {
    try {
        for (let i = 1; i <= 4; i++) {
            const formData = new FormData();
            formData.append('page', 'about');
            formData.append('section', 'core-value-' + i);
            formData.append('content_type', 'text');
            formData.append('content', document.getElementById('coreValue' + i).value);
            await API.createContent(formData);
        }
        
        Toast.show('Core values saved successfully', 'success');
    } catch (err) {
        console.error(err);
        Toast.show('Error saving core values', 'error');
    }
}

// Booking Notes Management
async function loadBookingNotes() {
    try {
        const response = await API.getContent();
        const content = response.data.filter(item => item.page === 'booking');

        content.forEach(item => {
            if (item.section === 'note-1' && document.getElementById('bookingNote1')) {
                document.getElementById('bookingNote1').value = item.content || '';
            }
            if (item.section === 'note-2' && document.getElementById('bookingNote2')) {
                document.getElementById('bookingNote2').value = item.content || '';
            }
            if (item.section === 'note-3' && document.getElementById('bookingNote3')) {
                document.getElementById('bookingNote3').value = item.content || '';
            }
            if (item.section === 'note-4' && document.getElementById('bookingNote4')) {
                document.getElementById('bookingNote4').value = item.content || '';
            }
            if (item.section === 'direct-title' && document.getElementById('bookingDirectTitle')) {
                document.getElementById('bookingDirectTitle').value = item.content || '';
            }
            if (item.section === 'direct-phone' && document.getElementById('bookingDirectPhone')) {
                document.getElementById('bookingDirectPhone').value = item.content || '';
            }
            if (item.section === 'cta-title' && document.getElementById('bookingCtaTitle')) {
                document.getElementById('bookingCtaTitle').value = item.content || '';
            }
            if (item.section === 'cta-subtitle' && document.getElementById('bookingCtaSubtitle')) {
                document.getElementById('bookingCtaSubtitle').value = item.content || '';
            }
            if (item.section === 'cta-phone' && document.getElementById('bookingCtaPhone')) {
                document.getElementById('bookingCtaPhone').value = item.content || '';
            }
        });
    } catch (err) {
        console.error(err);
    }
}

async function saveBookingNotes() {
    try {
        const payload = [];
        for (let i = 1; i <= 4; i++) {
            const content = document.getElementById('bookingNote' + i)?.value || '';
            if (content.trim()) {
                payload.push({ section: 'note-' + i, content });
            }
        }
        if (payload.length > 0) {
            await API.updateContentBulk('booking', payload);
        }
        Toast.show('Booking notes saved successfully', 'success');
    } catch (err) {
        console.error(err);
        Toast.show('Error saving booking notes', 'error');
    }
}

// Individual Field Save Functions - Home Page
async function saveSingleField(page, section, elementId, label) {
    try {
        const content = document.getElementById(elementId).value;
        const formData = new FormData();
        formData.append('page', page);
        formData.append('section', section);
        formData.append('content_type', 'text');
        formData.append('content', content);
        await API.createContent(formData);
        Toast.show(label + ' saved successfully', 'success');
    } catch (err) {
        console.error(err);
        Toast.show('Error saving ' + label, 'error');
    }
}


// Calculator Page Functions
async function saveCalcField(section, elementId, label) {
    try {
        const content = document.getElementById(elementId).value;
        const formData = new FormData();
        formData.append('page', 'calculator');
        formData.append('section', section);
        formData.append('content_type', 'text');
        formData.append('content', content);
        await API.createContent(formData);
        Toast.show(label + ' saved successfully', 'success');
    } catch (err) {
        console.error(err);
        Toast.show('Error saving ' + label, 'error');
    }
}

async function loadCalculatorContent() {
    try {
        const response = await API.getContent();
        const items = response.data || [];
        const calcItems = items.filter(i => i.page === 'calculator');
        calcItems.forEach(item => {
            const el = document.getElementById('calcSidebar' + item.section.charAt(0).toUpperCase() + item.section.slice(1));
            if (el) el.value = item.content || '';
        });
    } catch (err) {
        console.error(err);
    }
}

// Individual Footer Field Save Functions
async function saveFooterAddress() { await saveSingleField('global', 'footer-address', 'footerAddress', 'Footer Address'); }
async function saveFooterPhone() { await saveSingleField('global', 'footer-phone', 'footerPhone', 'Footer Phone'); }
async function saveFooterEmail() { await saveSingleField('global', 'footer-email', 'footerEmail', 'Footer Email'); }
async function saveFooterHours() { await saveSingleField('global', 'footer-hours', 'footerHours', 'Footer Hours'); }
async function saveFooterDescription() { await saveSingleField('global', 'footer-description', 'footerDescription', 'Footer Description'); }

// Individual About Page Field Save Functions
async function saveAboutStoryTitle() { await saveSingleField('about', 'story-title', 'aboutStoryTitle', 'Story Title'); }
async function saveAboutStoryPara1() { await saveSingleField('about', 'story-para1', 'aboutStoryPara1', 'Story Paragraph 1'); }
async function saveAboutStoryPara2() { await saveSingleField('about', 'story-para2', 'aboutStoryPara2', 'Story Paragraph 2'); }
async function saveAboutMissionText() { await saveSingleField('about', 'mission-text', 'aboutMissionText', 'Mission Text'); }

// Services Page Functions
async function saveServicesField(page, section, elementId, label) {
    try {
        const content = document.getElementById(elementId)?.value || '';
        await API.updateContentBulk(page, [{ section, content }]);
        Toast.show(label + ' saved successfully', 'success');
    } catch (err) {
        console.error(err);
        Toast.show('Error saving ' + label, 'error');
    }
}

async function saveServicesPoints(serviceNum, elementId) {
    try {
        const raw = document.getElementById(elementId)?.value || '';
        const lines = raw.split('\n').map(l => l.trim()).filter(l => l).slice(0, 4);
        const payload = lines.map((content, i) => ({ section: `service-${serviceNum}-point-${i + 1}`, content }));
        await API.updateContentBulk('services', payload);
        Toast.show(`Service ${serviceNum} points saved`, 'success');
    } catch (err) {
        console.error(err);
        Toast.show('Error saving points', 'error');
    }
}

// ==========================================
// DYNAMIC SERVICES MANAGEMENT
// ==========================================

function createServiceCardHTML(num, data) {
    const d = data || {};
    return `
        <div class="flex justify-between items-center mb-4">
            <h5 class="text-navy font-semibold text-lg">Service ${num}</h5>
            <div class="flex gap-2">
                <button onclick="saveServiceCard(${num})" class="btn-premium px-4 py-2 rounded-lg text-sm">Save All</button>
                <button onclick="removeService(${num})" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm">Delete</button>
            </div>
        </div>
        <div class="mb-3">
            <label class="block text-navy font-semibold mb-1 text-sm">Image URL</label>
            <div class="flex gap-2">
                <input type="text" id="svc-${num}-image" value="${escapeHtml(d.image || d.content || '')}" placeholder="https://example.com/image.jpg" class="input-premium flex-1 px-3 py-2 rounded-lg text-sm">
                <button onclick="saveServicesField('services', 'service-${num}-image', 'svc-${num}-image', 'Service ${num} Image')" class="btn-premium px-3 py-2 rounded-lg text-sm">Save URL</button>
            </div>
        </div>
        <div class="mb-3">
            <label class="block text-navy font-semibold mb-1 text-sm">Or Upload Image</label>
            <div class="flex gap-2">
                <input type="file" id="svc-${num}-image-upload" accept="image/*" class="input-premium flex-1 px-3 py-2 rounded-lg text-sm">
                <button onclick="uploadServiceImage(${num})" class="btn-premium px-3 py-2 rounded-lg text-sm">Upload</button>
            </div>
        </div>
        <div class="mb-3">
            <label class="block text-navy font-semibold mb-1 text-sm">Tagline</label>
            <div class="flex gap-2">
                <input type="text" id="svc-${num}-tagline" value="${escapeHtml(d.tagline || '')}" placeholder="Expert Representation" class="input-premium flex-1 px-3 py-2 rounded-lg text-sm">
                <button onclick="saveServicesField('services', 'service-${num}-tagline', 'svc-${num}-tagline', 'Service ${num} Tagline')" class="btn-premium px-3 py-2 rounded-lg text-sm">Save</button>
            </div>
        </div>
        <div class="mb-3">
            <label class="block text-navy font-semibold mb-1 text-sm">Icon (emoji)</label>
            <div class="flex gap-2">
                <input type="text" id="svc-${num}-icon" value="${escapeHtml(d.icon || '')}" placeholder="⚖️" class="input-premium flex-1 px-3 py-2 rounded-lg text-sm">
                <button onclick="saveServicesField('services', 'service-${num}-icon', 'svc-${num}-icon', 'Service ${num} Icon')" class="btn-premium px-3 py-2 rounded-lg text-sm">Save</button>
            </div>
        </div>
        <div class="mb-3">
            <label class="block text-navy font-semibold mb-1 text-sm">Title</label>
            <div class="flex gap-2">
                <input type="text" id="svc-${num}-title" value="${escapeHtml(d.title || '')}" placeholder="Service Title" class="input-premium flex-1 px-3 py-2 rounded-lg text-sm">
                <button onclick="saveServicesField('services', 'service-${num}-title', 'svc-${num}-title', 'Service ${num} Title')" class="btn-premium px-3 py-2 rounded-lg text-sm">Save</button>
            </div>
        </div>
        <div class="mb-3">
            <label class="block text-navy font-semibold mb-1 text-sm">Description</label>
            <div class="flex gap-2">
                <textarea id="svc-${num}-desc" rows="2" placeholder="Service description..." class="input-premium flex-1 px-3 py-2 rounded-lg text-sm resize-none">${escapeHtml(d.desc || '')}</textarea>
                <button onclick="saveServicesField('services', 'service-${num}-desc', 'svc-${num}-desc', 'Service ${num} Description')" class="btn-premium px-3 py-2 rounded-lg text-sm self-start">Save</button>
            </div>
        </div>
        <div class="mb-3">
            <label class="block text-navy font-semibold mb-1 text-sm">Points (one per line, max 4)</label>
            <div class="flex gap-2">
                <textarea id="svc-${num}-points" rows="3" placeholder="Point 1&#10;Point 2&#10;Point 3&#10;Point 4" class="input-premium flex-1 px-3 py-2 rounded-lg text-sm resize-none">${escapeHtml((d.points || []).join('\n'))}</textarea>
                <button onclick="saveServicesPoints(${num}, 'svc-${num}-points')" class="btn-premium px-3 py-2 rounded-lg text-sm self-start">Save</button>
            </div>
        </div>
    `;
}

function addServiceCard(num, data) {
    const container = document.getElementById('allServicesContainer');
    if (!container) return;
    if (!num) {
        const cards = container.querySelectorAll('[id^="svc-card-"]');
        let max = 0;
        cards.forEach(c => {
            const n = parseInt(c.id.replace('svc-card-', ''));
            if (n > max) max = n;
        });
        num = max + 1;
    }
    const existing = document.getElementById(`svc-card-${num}`);
    if (existing) return;
    const card = document.createElement('div');
    card.className = 'glass-card p-6 rounded-xl mb-4 border border-slate-200';
    card.id = `svc-card-${num}`;
    card.innerHTML = createServiceCardHTML(num, data);
    container.appendChild(card);
}

async function removeService(num) {
    if (!confirm(`Delete Service ${num} and all its data?`)) return;
    try {
        const sections = [
            `service-${num}-image`,
            `service-${num}-tagline`,
            `service-${num}-icon`,
            `service-${num}-title`,
            `service-${num}-desc`,
            `service-${num}-point-1`,
            `service-${num}-point-2`,
            `service-${num}-point-3`,
            `service-${num}-point-4`
        ];
        await API.deleteContentBulk('services', sections);
        const card = document.getElementById(`svc-card-${num}`);
        if (card) card.remove();
        Toast.show(`Service ${num} deleted`, 'success');
    } catch (err) {
        console.error(err);
        Toast.show('Error deleting service', 'error');
    }
}

async function uploadServiceImage(serviceNum) {
    const fileInput = document.getElementById(`svc-${serviceNum}-image-upload`);
    const file = fileInput?.files[0];
    if (!file) {
        Toast.show('Please select an image first', 'error');
        return;
    }
    try {
        const formData = new FormData();
        formData.append('page', 'services');
        formData.append('section', `service-${serviceNum}-image`);
        formData.append('content_type', 'image');
        formData.append('image', file);
        await API.createContent(formData);
        const urlInput = document.getElementById(`svc-${serviceNum}-image`);
        if (urlInput) urlInput.value = '';
        Toast.show(`Service ${serviceNum} image uploaded`, 'success');
        fileInput.value = '';
    } catch (err) {
        console.error(err);
        Toast.show('Error uploading image', 'error');
    }
}

async function saveServiceCard(num) {
    const getVal = (id) => document.getElementById(id)?.value || '';
    const getPoints = (id) => {
        return getVal(id).split('\n').map(l => l.trim()).filter(l => l).slice(0, 4);
    };
    const payload = [
        { section: `service-${num}-image`, content: getVal(`svc-${num}-image`) },
        { section: `service-${num}-tagline`, content: getVal(`svc-${num}-tagline`) },
        { section: `service-${num}-icon`, content: getVal(`svc-${num}-icon`) },
        { section: `service-${num}-title`, content: getVal(`svc-${num}-title`) },
        { section: `service-${num}-desc`, content: getVal(`svc-${num}-desc`) }
    ];
    const points = getPoints(`svc-${num}-points`);
    points.forEach((p, i) => payload.push({ section: `service-${num}-point-${i+1}`, content: p }));
    for (let i = points.length + 1; i <= 4; i++) {
        payload.push({ section: `service-${num}-point-${i}`, content: '' });
    }
    try {
        await API.updateContentBulk('services', payload);
        Toast.show(`Service ${num} saved successfully`, 'success');
    } catch (err) {
        console.error(err);
        Toast.show('Error saving service', 'error');
    }
}

async function saveAllServices() {
    const cards = document.querySelectorAll('#allServicesContainer .glass-card');
    let total = 0;
    for (const card of cards) {
        const id = card.id;
        const num = parseInt(id.replace('svc-card-', ''));
        if (!isNaN(num)) {
            await saveServiceCard(num);
            total++;
        }
    }
    Toast.show(`${total} services saved`, 'success');
}

async function loadServicesContent() {
    try {
        const response = await API.getContent();
        const content = response.data;

        // Load services hero fields
        const svcTagline = content.find(c => c.page === 'services' && c.section === 'tagline');
        const svcTitle = content.find(c => c.page === 'services' && c.section === 'title');
        if (svcTagline && document.getElementById('servicesTagline')) document.getElementById('servicesTagline').value = svcTagline.content || '';
        if (svcTitle && document.getElementById('servicesTitle')) document.getElementById('servicesTitle').value = svcTitle.content || '';

        // Load contact tab fields
        content.forEach(item => {
            if (item.page === 'contact') {
                const map = {
                    'tagline': 'contactTagline',
                    'title': 'contactTitle',
                    'form-title': 'contactFormTitle',
                    'map-title': 'contactMapTitle',
                    'map-address': 'contactMapAddress',
                    'map-link': 'contactMapLink'
                };
                const elId = map[item.section];
                if (elId && document.getElementById(elId)) {
                    document.getElementById(elId).value = item.content || '';
                }
            }
        });

        // Group services data by service number
        const svcData = {};
        content.forEach(item => {
            if (item.page !== 'services') return;
            const match = item.section.match(/^service-(\d+)-(.+)$/);
            if (!match) return;
            const num = parseInt(match[1]);
            const field = match[2];
            if (!svcData[num]) svcData[num] = { num };
            if (field === 'image') svcData[num].image = item.image || item.content || '';
            else if (field === 'tagline') svcData[num].tagline = item.content || '';
            else if (field === 'icon') svcData[num].icon = item.content || '';
            else if (field === 'title') svcData[num].title = item.content || '';
            else if (field === 'desc') svcData[num].desc = item.content || '';
            else if (field.match(/^point-\d+$/)) {
                if (!svcData[num].points) svcData[num].points = [];
                const pn = parseInt(field.split('-')[1]);
                svcData[num].points[pn - 1] = item.content || '';
            }
        });

        // Render service cards sorted by number
        const nums = Object.keys(svcData).map(Number).sort((a, b) => a - b);
        nums.forEach(num => addServiceCard(num, svcData[num]));
    } catch (err) {
        console.error(err);
    }
}

async function loadContactContent() {
    loadServicesContent();
}

async function uploadMapImage() {
    const fileInput = document.getElementById('contactMapImageUpload');
    const file = fileInput?.files[0];
    if (!file) {
        Toast.show('Please select an image first', 'error');
        return;
    }
    try {
        const formData = new FormData();
        formData.append('page', 'contact');
        formData.append('section', 'map-image');
        formData.append('content_type', 'image');
        formData.append('image', file);
        await API.createContent(formData);
        Toast.show('Map image uploaded', 'success');
        fileInput.value = '';
    } catch (err) {
        console.error(err);
        Toast.show('Error uploading image', 'error');
    }
}



// ==========================================
// CONTACT PAGE MANAGEMENT (Office Details)
// ==========================================

async function saveContactOfficeDetails() {
    const sections = [
        { section: 'office-name', elementId: 'contactOfficeName' },
        { section: 'office-address-1', elementId: 'contactOfficeAddress1' },
        { section: 'office-address-2', elementId: 'contactOfficeAddress2' },
        { section: 'phone-main', elementId: 'contactPhoneMain' },
        { section: 'phone-alt', elementId: 'contactPhoneAlt' },
        { section: 'phone-emergency', elementId: 'contactPhoneEmergency' },
        { section: 'email-primary', elementId: 'contactEmailPrimary' },
        { section: 'email-secondary', elementId: 'contactEmailSecondary' },
        { section: 'hours-weekday', elementId: 'contactHoursWeekday' },
        { section: 'hours-saturday', elementId: 'contactHoursSaturday' },
        { section: 'hours-sunday', elementId: 'contactHoursSunday' }
    ];
    try {
        const payload = sections.map(item => ({
            section: item.section,
            content: document.getElementById(item.elementId)?.value || ''
        }));
        await API.updateContentBulk('contact', payload);
        Toast.show('Office details saved', 'success');
    } catch (err) {
        console.error(err);
        Toast.show('Error saving office details', 'error');
    }
}

async function loadContactOfficeDetails() {
    try {
        const response = await API.getContent();
        const content = response.data.filter(item => item.page === 'contact');

        content.forEach(item => {
            const map = {
                'office-name': 'contactOfficeName',
                'office-address-1': 'contactOfficeAddress1',
                'office-address-2': 'contactOfficeAddress2',
                'phone-main': 'contactPhoneMain',
                'phone-alt': 'contactPhoneAlt',
                'phone-emergency': 'contactPhoneEmergency',
                'email-primary': 'contactEmailPrimary',
                'email-secondary': 'contactEmailSecondary',
                'hours-weekday': 'contactHoursWeekday',
                'hours-saturday': 'contactHoursSaturday',
                'hours-sunday': 'contactHoursSunday'
            };
            const elId = map[item.section];
            if (elId && document.getElementById(elId)) {
                document.getElementById(elId).value = item.content || '';
            }
        });
    } catch (err) {
        console.error(err);
    }
}

