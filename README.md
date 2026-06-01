# Advocate Law Firm Website

A fully functional website for advocates with booking system, blog management, and admin panel.

## Features

### Public Pages
- **Home**: Showcases advocate's experience, services, and latest blog posts
- **About**: Detailed information about the advocate, experience, and team
- **Services**: Comprehensive list of legal services offered
- **Contact**: Office details, phone numbers, email, and contact form
- **Blog**: Legal insights and articles with full blog post views
- **Booking**: Online appointment booking system

### Admin Panel (/admin.html)
- Secure login system (admin/admin123)
- Create, edit, and delete blog posts through UI
- Upload images for blog posts
- Manage booking appointments (approve/reject)
- No coding required for blog management

## Tech Stack
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js with Express
- **Database**: SQLite3
- **Authentication**: JWT (JSON Web Tokens)

## Installation & Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start the Server**
   ```bash
   npm start
   ```
   Server runs on `http://localhost:3000`

3. **Access the Website**
   - Main Site: `http://localhost:3000`
   - Admin Panel: `http://localhost:3000/admin.html`

## Default Admin Credentials
- Username: `admin`
- Password: `admin123`

## Project Structure
```
ADV/
├── server.js              # Express server & API endpoints
├── package.json           # Dependencies
├── database/              # SQLite database
└── public/
    ├── index.html         # Homepage
    ├── about.html         # About page
    ├── services.html      # Services page
    ├── contact.html       # Contact page
    ├── blog.html          # Blog listing & posts
    ├── booking.html       # Appointment booking
    ├── admin.html         # Admin panel
    ├── css/
    │   └── style.css      # Minimal light theme
    ├── js/
    │   ├── main.js        # Frontend functionality
    │   └── admin.js       # Admin panel logic
    └── images/            # Uploaded images
```

## API Endpoints

### Public
- `GET /api/blogs` - List all blogs
- `GET /api/blogs/:id` - Get single blog
- `POST /api/bookings` - Create booking

### Admin (Requires Auth)
- `POST /api/login` - Admin login
- `POST /api/blogs` - Create blog (with image upload)
- `PUT /api/blogs/:id` - Update blog
- `DELETE /api/blogs/:id` - Delete blog
- `GET /api/bookings` - List all bookings
- `PUT /api/bookings/:id/status` - Update booking status

## Notes
- Images are served from `/images` directory
- Booking statuses: pending, approved, rejected
- JWT token expires in 24 hours
- Make sure to run `npm install` before starting the server
