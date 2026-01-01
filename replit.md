# Triple A - Industrial Plastic Manufacturing Website

## Overview

Triple A is a B2B wholesale e-commerce website for an industrial plastic bag manufacturing company. The application enables commercial partners to browse product catalogs, place bulk orders, and manage their accounts. It includes an admin portal for product management and order tracking.

The project is a static frontend website that connects to Supabase for backend services (authentication, database, and storage).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Type**: Static HTML/CSS/JavaScript website
- **Structure**: Multi-page application with separate HTML files for each route
- **Styling**: Custom CSS with CSS variables for theming, Inter font family
- **JavaScript**: ES6 modules loaded via `type="module"` script tags
- **Design Pattern**: Direct DOM manipulation with vanilla JavaScript

### Key Pages
- `index.html` - Landing page with company overview
- `products.html` - Product catalog with ordering functionality
- `auth.html` - User authentication (sign in/sign up)
- `admin.html` - Admin dashboard for product/order management
- `about.html` / `contact.html` - Static informational pages

### Backend Services (Supabase)
- **Authentication**: Supabase Auth for user sign-in/sign-up
- **Database**: Supabase PostgreSQL for products and orders tables
- **Admin Detection**: Simple email-based check (emails containing 'admin')

### Database Schema (Supabase Tables)
- **products**: id, name, size, color, thickness_microns, price_per_1000
- **orders**: id, product_id, quantity, user_id, status

### Payment Integration
- **Stripe**: Client-side Stripe.js loaded but not fully implemented
- **Current State**: Orders are simulated with confirmation dialogs; real Stripe checkout sessions require a backend server

## External Dependencies

### Third-Party Services
- **Supabase** (`https://cfslslxrbqmlxhpzkiwt.supabase.co`): Authentication, PostgreSQL database
- **Stripe**: Payment processing (client library loaded, backend integration pending)

### CDN Dependencies
- **Supabase JS Client**: `https://esm.sh/@supabase/supabase-js` - Database and auth client
- **Stripe.js**: `https://js.stripe.com/v3/` - Payment processing
- **Google Fonts**: Inter font family

### Configuration
- Supabase credentials stored in `public/js/config.js`
- Some HTML files have inline script tags with placeholder credentials that need consolidation