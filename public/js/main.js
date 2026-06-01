function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' };
    return String(str).replace(/[&<>"']/g, c => map[c]);
}

document.addEventListener('DOMContentLoaded', function() {
    loadLatestBlogs();
    setupContactForm();
    setupBookingForm();
    setupDateValidation();
    loadAnnouncements();
    loadDynamicContent();
    loadTeamMembers();
});

async function loadLatestBlogs() {
    const blogList = document.getElementById('latest-blogs') || document.getElementById('blogList');
    if (!blogList) return;

    try {
        const response = await API.getBlogs(1, 10);
        const blogs = response.data;
        if (document.getElementById('latest-blogs')) {
            displayLatestBlogs(blogs.slice(0, 3));
        } else {
            displayAllBlogs(blogs);
        }
    } catch (err) {
        console.error('Failed to load blogs', err);
    }
}

function displayLatestBlogs(blogs) {
    const container = document.getElementById('latest-blogs');
    container.innerHTML = blogs.map(blog => `
        <div class="card-luxury rounded-2xl overflow-hidden hover-lift cursor-pointer" onclick="viewBlog(${blog.id})">
            ${blog.image ? `<img src="${blog.image}" alt="${escapeHtml(blog.title)}" class="w-full h-48 object-cover" loading="lazy">` : ''}
            <div class="p-6">
                <h3 class="font-serif text-xl font-bold text-navy mb-3">${escapeHtml(blog.title)}</h3>
                <p class="text-slate-500 font-light text-sm mb-4">${escapeHtml(blog.content.substring(0, 100))}...</p>
                <div class="flex items-center justify-between">
                    <span class="text-slate-400 text-sm">${new Date(blog.created_at).toLocaleDateString()}</span>
                    <span class="text-navy font-semibold text-sm hover:text-slate-600 transition-colors">Read More →</span>
                </div>
            </div>
        </div>
    `).join('');
}

function displayAllBlogs(blogs) {
    const container = document.getElementById('blogList');
    if (!container) return;
    
    container.innerHTML = blogs.map(blog => `
        <div class="border border-slate-200 rounded-2xl overflow-hidden hover:-translate-y-1 transition-transform cursor-pointer shadow-sm" onclick="viewBlog(${blog.id})">
            ${blog.image ? `<img src="${blog.image}" alt="${escapeHtml(blog.title)}" class="w-full h-56 object-cover" loading="lazy">` : ''}
            <div class="p-8">
                <div class="flex items-center space-x-4 mb-4 text-sm text-slate-500">
                    <span>📅 ${new Date(blog.created_at).toLocaleDateString()}</span>
                    <span>✍️ ${escapeHtml(blog.author)}</span>
                </div>
                <h3 class="font-serif text-2xl font-bold text-navy mb-4">${escapeHtml(blog.title)}</h3>
                <p class="text-slate-500 font-light mb-6">${escapeHtml(blog.content.substring(0, 150))}...</p>
                <span class="text-navy font-semibold hover:text-slate-600 transition-colors inline-flex items-center space-x-2">
                    <span>Read Full Article</span>
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                </span>
            </div>
        </div>
    `).join('');
}

async function viewBlog(id) {
    try {
        const response = await API.getBlogById(id);
        const blog = response.data;
        document.getElementById('blogList').classList.add('hidden');
        const detailDiv = document.getElementById('blogDetail');
        detailDiv.classList.remove('hidden');
        detailDiv.querySelector('#blogContent').innerHTML = `
            ${blog.image ? `<img src="${blog.image}" alt="${escapeHtml(blog.title)}" class="w-full h-96 object-cover rounded-2xl mb-8">` : ''}
            <div class="animate-fadeInUp">
                <h1 class="font-serif text-4xl md:text-5xl font-bold text-navy mb-6">${escapeHtml(blog.title)}</h1>
                <div class="flex items-center space-x-6 mb-10 text-slate-500">
                    <span>✍️ By ${escapeHtml(blog.author)}</span>
                    <span>📅 ${new Date(blog.created_at).toLocaleDateString()}</span>
                </div>
                <div class="blog-content text-lg leading-relaxed text-slate-700 font-light">
                    ${blog.content.split('\n').map(p => `<p class="mb-4">${escapeHtml(p)}</p>`).join('')}
                </div>
            </div>
        `;
    } catch (err) {
        console.error('Failed to load blog', err);
    }
}

function showBlogList() {
    document.getElementById('blogList').classList.remove('hidden');
    document.getElementById('blogDetail').classList.add('hidden');
}

function setupContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    const submitBtn = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="animate-pulse">Sending...</span>';
        submitBtn.disabled = true;

        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        try {
            await API.createContact(data);
            Toast.show('Message sent successfully! We will get back to you within 24 hours.', 'success');
            form.reset();
        } catch (err) {
            // Error handled by API wrapper
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}

function setupBookingForm() {
    const form = document.getElementById('bookingForm');
    if (!form) return;

    const submitBtn = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Loading state
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="animate-pulse">Submitting...</span>';
        submitBtn.disabled = true;

        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        if (data.service === 'Other' && data.otherService) {
            data.service = data.otherService;
        }

        try {
            await API.createBooking(data);
            Toast.show('Booking submitted successfully! We will confirm within 24 hours.', 'success');
            form.reset();
        } catch (err) {
            // Error handling is managed by API wrapper
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}

function setupDateValidation() {
    const dateInput = document.getElementById('date');
    if (!dateInput) return;
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateInput.min = tomorrow.toISOString().split('T')[0];
}

async function loadAnnouncements() {
    const annContainer = document.getElementById('announcementsBanner');
    if (!annContainer) return;

    try {
        const response = await API.getAnnouncements();
        const announcements = response.data;
        if (announcements.length === 0) {
            annContainer.classList.add('hidden');
            return;
        }
        
        annContainer.classList.remove('hidden');
        annContainer.innerHTML = announcements.map(ann => `
            <div class="inline-block px-4 py-2 rounded-full text-sm font-medium ${getAnnouncementBadge(ann.type)}">
                ${escapeHtml(ann.type.toUpperCase())}: ${escapeHtml(ann.title)} - ${escapeHtml(ann.content || '')}
            </div>
        `).join('');
    } catch (err) {
        console.error('Failed to load announcements', err);
    }
}

function getAnnouncementBadge(type) {
    const badges = {
        'holiday': 'bg-blue-50 text-blue-800 border border-blue-200',
        'emergency': 'bg-red-50 text-red-800 border border-red-200',
        'notice': 'bg-yellow-50 text-yellow-800 border border-yellow-200',
        'court': 'bg-purple-50 text-purple-800 border border-purple-200',
        'update': 'bg-green-50 text-green-800 border border-green-200',
        'other': 'bg-gray-50 text-gray-800 border border-gray-200'
    };
    return badges[type] || 'bg-slate-50 text-slate-800 border border-slate-200';
}

async function loadDynamicContent() {
    try {
        const response = await API.getContent();
        const items = response.data;
        
        // Only update if there is content in database
        if (!items || items.length === 0) {
            console.log('No dynamic content, showing defaults');
            return;
        }
        
        // Filter out empty items and check for valid content
        const validItems = items.filter(item => item.content || item.image);
        if (validItems.length === 0) {
            console.log('No valid content found, showing defaults');
            return;
        }
        
        validItems.forEach(item => {
            // Handle home page content
            if (item.page === 'home') {
                if (item.section === 'about-snippet') {
                    const el = document.getElementById('home-about-snippet');
                    if (el) el.textContent = item.content || '';
                }
                if (item.section === 'about-image') {
                    const el = document.getElementById('home-about-image');
                    if (el) {
                        const src = item.image || item.content;
                        if (src) {
                            el.src = src.startsWith('/images/') ? window.location.origin + src : src;
                        }
                    }
                }
                if (item.section === 'stat-1-value') {
                    const el = document.getElementById('home-stat-1');
                    if (el) el.textContent = item.content || '';
                }
                if (item.section === 'stat-1-label') {
                    const el = document.getElementById('home-stat-1-label');
                    if (el) el.textContent = item.content || '';
                }
                if (item.section === 'stat-2-value') {
                    const el = document.getElementById('home-stat-2');
                    if (el) el.textContent = item.content || '';
                }
                if (item.section === 'stat-2-label') {
                    const el = document.getElementById('home-stat-2-label');
                    if (el) el.textContent = item.content || '';
                }
                if (item.section === 'stat-3-value') {
                    const el = document.getElementById('home-stat-3');
                    if (el) el.textContent = item.content || '';
                }
                if (item.section === 'stat-3-label') {
                    const el = document.getElementById('home-stat-3-label');
                    if (el) el.textContent = item.content || '';
                }
            }
            // Handle global/footer content
            if (item.page === 'global' || item.page === 'footer') {
                if (item.section === 'footer-address' || item.section === 'address') {
                    const el = document.getElementById('content-footer-address');
                    if (el) el.textContent = item.content;
                }
                if (item.section === 'footer-phone' || item.section === 'phone') {
                    const el = document.getElementById('content-footer-phone');
                    if (el) el.textContent = item.content;
                    document.querySelectorAll('a[href^="tel:"]').forEach(link => {
                        link.href = `tel:${item.content.replace(/\s/g, '')}`;
                    });
                }
                if (item.section === 'footer-email' || item.section === 'email') {
                    const el = document.getElementById('content-footer-email');
                    if (el) {
                        el.textContent = item.content;
                        el.href = `mailto:${item.content}`;
                    }
                }
                if (item.section === 'footer-hours' || item.section === 'hours') {
                    const el = document.getElementById('content-footer-hours');
                    if (el) el.textContent = item.content;
                }
                if (item.section === 'footer-description') {
                    const el = document.getElementById('content-footer-description');
                    if (el) el.textContent = item.content;
                }
            }
            
            // Handle about page content
            if (item.page === 'about') {
                if (item.section === 'story-title' && document.getElementById('about-story-title')) {
                    document.getElementById('about-story-title').textContent = item.content;
                }
                if (item.section === 'story-para1' && document.getElementById('about-story-para1')) {
                    document.getElementById('about-story-para1').textContent = item.content;
                }
                if (item.section === 'story-para2' && document.getElementById('about-story-para2')) {
                    document.getElementById('about-story-para2').textContent = item.content;
                }
                if (item.section === 'mission-text' && document.getElementById('about-mission-text')) {
                    document.getElementById('about-mission-text').textContent = item.content;
                }
                if (item.section === 'image' && document.getElementById('about-image')) {
                    let imgSrc = item.image || item.content;
                    if (imgSrc) {
                        if (imgSrc.startsWith('/images/')) {
                            imgSrc = window.location.origin + imgSrc;
                        }
                        document.getElementById('about-image').src = imgSrc;
                    }
                }
                if (item.section.startsWith('expertise-title-') && document.getElementById(item.section)) {
                    document.getElementById(item.section).textContent = item.content;
                }
                if (item.section.startsWith('expertise-desc-') && document.getElementById(item.section)) {
                    document.getElementById(item.section).textContent = item.content;
                }
                if (item.section.startsWith('core-value-') && document.getElementById(item.section)) {
                    document.getElementById(item.section).textContent = item.content;
                    const li = document.getElementById(item.section).closest('li');
                    if (li) li.dataset.value = item.content;
                }
            }
            
            // Handle booking page content
            if (item.page === 'booking') {
                if (item.section.startsWith('booking-note-') && document.getElementById(`content-${item.page}-${item.section}`)) {
                    document.getElementById(`content-${item.page}-${item.section}`).innerHTML = escapeHtml(item.content);
                }
                const bookingNoteEl = document.getElementById('booking-' + item.section.replace('note-', 'note-'));
                if (bookingNoteEl && item.section.startsWith('note-')) {
                    bookingNoteEl.innerHTML = escapeHtml(item.content);
                }
                if (item.section === 'cta-title' && document.getElementById('booking-cta-title')) {
                    document.getElementById('booking-cta-title').textContent = item.content;
                }
                if (item.section === 'cta-subtitle' && document.getElementById('booking-cta-subtitle')) {
                    document.getElementById('booking-cta-subtitle').textContent = item.content;
                }
                if (item.section === 'cta-phone') {
                    const el = document.getElementById('booking-cta-phone');
                    if (el) {
                        el.textContent = 'Emergency: ' + item.content;
                        el.href = 'tel:' + item.content.replace(/\s/g, '');
                    }
                }
                if (item.section === 'direct-title' && document.getElementById('booking-direct-title')) {
                    document.getElementById('booking-direct-title').textContent = item.content;
                }
                if (item.section === 'direct-phone') {
                    const el = document.getElementById('booking-direct-phone');
                    if (el) {
                        el.textContent = '📞 ' + item.content;
                        el.href = 'tel:' + item.content.replace(/\s/g, '');
                    }
                }
            }
            
            // Handle other page content
            const element = document.getElementById(`content-${item.page}-${item.section}`);
            if (element) {
                if (item.content_type === 'text') {
                    element.innerHTML = escapeHtml(item.content);
                } else if (item.content_type === 'image') {
                    element.src = item.image || item.content;
                }
            }
            
            // Handle home page content
            if (item.page === 'home') {
                const homeElement = document.getElementById(`home-${item.section}`);
                if (homeElement) {
                    if (item.section === 'about-image') {
                        let imgSrc = item.image || item.content;
                        if (imgSrc && imgSrc.startsWith('/images/')) {
                            imgSrc = window.location.origin + imgSrc;
                        }
                        homeElement.src = imgSrc;
                    } else {
                        homeElement.textContent = item.content;
                    }
                }
                if (item.section === 'hero-title-2' && document.getElementById('home-hero-title-2')) {
                    document.getElementById('home-hero-title-2').textContent = item.content;
                }
            }
            
            // Handle contact page CTA
            if (item.page === 'contact') {
                if (item.section === 'cta-title' && document.getElementById('contact-cta-title')) {
                    document.getElementById('contact-cta-title').textContent = item.content;
                }
                if (item.section === 'cta-subtitle' && document.getElementById('contact-cta-subtitle')) {
                    document.getElementById('contact-cta-subtitle').textContent = item.content;
                }
                if (item.section === 'cta-phone' && document.getElementById('contact-cta-phone')) {
                    const phone = item.content || item.phone || '+91 98765 43210';
                    document.getElementById('contact-cta-phone').textContent = 'Call Now: ' + phone;
                    document.getElementById('contact-cta-phone').href = 'tel:' + phone.replace(/\s/g, '');
                }
                // Office Details
                if (item.section === 'office-name' && document.getElementById('contact-office-name')) {
                    document.getElementById('contact-office-name').textContent = item.content;
                }
                if (item.section === 'office-address-1' && document.getElementById('contact-office-address-1')) {
                    document.getElementById('contact-office-address-1').textContent = item.content;
                }
                if (item.section === 'office-address-2' && document.getElementById('contact-office-address-2')) {
                    document.getElementById('contact-office-address-2').textContent = item.content;
                }
                if (item.section === 'phone-main' && document.getElementById('contact-phone-main')) {
                    document.getElementById('contact-phone-main').textContent = item.content;
                }
                if (item.section === 'phone-alt' && document.getElementById('contact-phone-alt')) {
                    document.getElementById('contact-phone-alt').textContent = item.content;
                }
                if (item.section === 'phone-emergency' && document.getElementById('contact-phone-emergency')) {
                    document.getElementById('contact-phone-emergency').textContent = item.content;
                }
                if (item.section === 'email-primary' && document.getElementById('contact-email-primary')) {
                    document.getElementById('contact-email-primary').textContent = item.content;
                }
                if (item.section === 'email-secondary' && document.getElementById('contact-email-secondary')) {
                    document.getElementById('contact-email-secondary').textContent = item.content;
                }
                if (item.section === 'hours-weekday' && document.getElementById('contact-hours-weekday')) {
                    document.getElementById('contact-hours-weekday').textContent = item.content;
                }
                if (item.section === 'hours-saturday' && document.getElementById('contact-hours-saturday')) {
                    document.getElementById('contact-hours-saturday').textContent = item.content;
                }
if (item.section === 'hours-sunday' && document.getElementById('contact-hours-sunday')) {
                    document.getElementById('contact-hours-sunday').textContent = item.content;
                }
                if (item.section === 'map-title' && document.getElementById('contact-map-title')) {
                    document.getElementById('contact-map-title').textContent = item.content;
                }
                if (item.section === 'map-address' && document.getElementById('contact-map-address')) {
                    document.getElementById('contact-map-address').textContent = item.content;
                }
                if (item.section === 'map-link' && document.getElementById('contact-map-link')) {
                    const link = document.getElementById('contact-map-link');
                    link.href = item.content || '#';
                    if (!item.content) link.removeAttribute('href');
                }
                if (item.section === 'map-image') {
                    const img = document.getElementById('contact-map-image');
                    if (img && item.image) {
                        let src = item.image;
                        if (src.startsWith('/images/')) src = window.location.origin + src;
                        img.src = src;
                        img.style.opacity = '0.4';
                    }
                }
            }
        });

        // Conditional visibility for phone/email/hour rows
        const hideRowById = (rowId, value) => {
            const row = document.getElementById(rowId);
            if (row) row.style.display = (value === null || value === undefined || value.trim() === '') ? 'none' : '';
        };

        const contentMap = {};
        const sectionExists = {};
        items.forEach(item => {
            if (item.page === 'contact') {
                contentMap[item.section] = item.content || '';
                sectionExists[item.section] = true;
            }
        });

        hideRowById('phone-alt-row', sectionExists['phone-alt'] ? contentMap['phone-alt'] : null);
        hideRowById('phone-emergency-row', sectionExists['phone-emergency'] ? contentMap['phone-emergency'] : null);
        hideRowById('email-secondary-row', sectionExists['email-secondary'] ? contentMap['email-secondary'] : null);
        hideRowById('hours-weekday-row', sectionExists['hours-weekday'] ? contentMap['hours-weekday'] : null);
        hideRowById('hours-saturday-row', sectionExists['hours-saturday'] ? contentMap['hours-saturday'] : null);
        hideRowById('hours-sunday-row', sectionExists['hours-sunday'] ? contentMap['hours-sunday'] : null);

        // Handle services page content - ALL services rendered dynamically
        const svcSections = {};
        validItems.forEach(item => {
            if (item.page === 'services') {
                // Page-level fields
                if (['tagline', 'title', 'subtitle'].includes(item.section)) {
                    const el = document.getElementById(`services-${item.section}`);
                    if (el) el.textContent = item.content || '';
                }
                // Service-level fields
                const match = item.section.match(/^service-(\d+)-(.+)$/);
                if (match) {
                    const num = parseInt(match[1]), field = match[2];
                    if (!svcSections[num]) svcSections[num] = {};
                    svcSections[num][field] = item;
                }
            }
        });

        const container = document.getElementById('services-dynamic-container');
        const nums = Object.keys(svcSections).map(Number).sort((a, b) => a - b);

        // Also check for existing service container IDs (for in-page nav)
        nums.forEach(num => {
            const data = svcSections[num];
            const hasTitle = data?.title?.content;
            if (!hasTitle) return;

            const el = document.getElementById(`service-${num}-container`);
            if (el) {
                // Card already exists (e.g., seeded in HTML) - just fill content
                fillServiceSection(num, data, validItems);
                return;
            }

            // Create new section
            const isReverse = (num % 2 === 0);
            const section = document.createElement('div');
            section.id = `service-${num}-container`;
            section.className = `flex flex-col lg:flex-row${isReverse ? '-reverse' : ''} items-center gap-16 mb-24`;
            const taglineContent = data?.tagline?.content || '';
            const titleContent = data?.title?.content || '';
            const descContent = data?.desc?.content || '';
            const imgSrc = (data?.image?.image || data?.image?.content) || 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600';

            section.innerHTML = `
                <div class="lg:w-1/2">
                    <div class="relative">
                        <img id="home-service-${num}-image" src="${escapeHtml(imgSrc)}" alt="${escapeHtml(titleContent)}" class="rounded-2xl shadow-2xl w-full aspect-[4/3] object-cover">
                    </div>
                </div>
                <div class="lg:w-1/2">
                    <span id="services-${num}-tagline" class="text-gold font-semibold text-sm tracking-[0.3em] uppercase">${escapeHtml(taglineContent)}</span>
                    <h2 id="services-${num}-title" class="font-serif text-4xl font-bold text-navy mt-4 mb-6">${escapeHtml(titleContent)}</h2>
                    <div class="section-divider ml-0 mb-6"></div>
                    <p id="services-${num}-desc" class="text-gray-600 text-lg leading-relaxed mb-8">${escapeHtml(descContent)}</p>
                    <div class="grid grid-cols-2 gap-4 mb-8" id="points-${num}-grid"></div>
                    <a href="booking.html" class="btn-luxury inline-block px-8 py-4 rounded-md font-semibold"><span>Consult Now</span></a>
                </div>
            `;
            container.appendChild(section);

            // Fill points
            setTimeout(() => fillServicePoints(num, data, validItems), 0);
        });

        function fillServiceSection(num, data, items) {
            ['tagline', 'title', 'desc'].forEach(field => {
                if (data?.[field]?.content) {
                    const el = document.getElementById(`services-${num}-${field}`);
                    if (el) el.textContent = data[field].content;
                }
            });
            if (data?.image) {
                const img = document.getElementById(`home-service-${num}-image`);
                if (img) {
                    const src = data.image.image || data.image.content;
                    if (src) img.src = src.startsWith('/images/') ? window.location.origin + src : src;
                }
            }
            fillServicePoints(num, data, items);
        }

        function fillServicePoints(num, data, items) {
            const grid = document.getElementById(`points-${num}-grid`);
            if (!grid) return;
            grid.innerHTML = '';
            for (let pn = 1; pn <= 4; pn++) {
                const key = `point-${pn}`;
                const content = data?.[key]?.content || '';
                if (content) {
                    const div = document.createElement('div');
                    div.className = 'flex items-center space-x-3';
                    div.id = `services-${num}-point-${pn}`;
                    div.innerHTML = `<span class="text-gold text-xl">◆</span><span class="text-gray-700">${escapeHtml(content)}</span>`;
                    grid.appendChild(div);
                }
            }
        }
    } catch (err) {
        console.error('Error loading dynamic content', err);
    }
}

async function loadTeamMembers() {
    const container = document.getElementById('teamMembersContainer');
    if (!container) return;
    
    try {
        const response = await API.getTeamMembers();
        const members = response.data;
        
        if (members.length > 0) {
            container.innerHTML = members.map(member => {
                let imgSrc = member.image || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400';
                if (imgSrc.startsWith('/images/')) {
                    imgSrc = window.location.origin + imgSrc;
                }
                return `
                <div class="card-luxury rounded-2xl overflow-hidden hover-lift">
                    <div class="relative overflow-hidden">
                        <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(member.name)}" class="w-full h-64 object-cover">
                        <div class="absolute inset-0 bg-gradient-to-t from-navy to-transparent opacity-0 hover:opacity-60 transition-opacity duration-300"></div>
                    </div>
                    <div class="p-6 text-center">
                        <h3 class="font-serif text-xl font-bold text-navy mb-1">${escapeHtml(member.name)}</h3>
                        <p class="text-gold font-semibold text-sm mb-3">${escapeHtml(member.position)}</p>
                        <p class="text-gray-600 text-sm">${escapeHtml(member.description)}</p>
                    </div>
                </div>`;
            }).join('');
        }
    } catch (err) {
        console.error('Error loading team members', err);
    }
}
