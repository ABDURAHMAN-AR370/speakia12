

# SPEAKAI - AI English Speaking Course Platform

A professional, corporate-styled 30-day course platform with admin management and progressive content unlocking.

---

## 🔐 Authentication System

### User Registration
- **Whitelist-based signup**: Only emails pre-approved by admin can register
- **Registration form collects**: Email (username), Full Name, Gender, Place, WhatsApp Number, Password
- **Login**: Email + Password authentication

### Admin Access
- Admin logs in using the same login page as regular users
- Admin role is assigned in the database (your email: 3370abdurahman@gmail.com will be the first admin)
- Secure role-based access control

---

## 👨‍💼 Admin Dashboard

### 1. User Management
- View all registered users with their progress (days completed, current status)
- Add single email to whitelist
- Bulk import emails (paste multiple or upload CSV)
- Remove users from whitelist
- View detailed user progress: which day they're on, materials completed

### 2. Day & Material Management
- Dashboard displays all 30 days as cards
- Click any day to manage its materials
- **When adding material, popup collects:**
  - Day selection (1-30 dropdown)
  - Work type (title/category)
  - Details/description
  - Material type: Image, Video, Link, or Audio
  - Upload/attach the selected material
  - Select a form (from previously created forms)
  - Set order/sequence of materials within the day
- Drag-and-drop reordering of materials
- Edit or delete any material later

### 3. Form Builder
- Create custom forms with drag-and-drop interface
- **Field types available:**
  - Short text
  - Long text/paragraph
  - Multiple choice (single select)
  - Checkboxes (multi-select)
  - File upload
  - Rating scale
  - Dropdown selection
- Save forms with custom names
- View list of all created forms
- Forms appear in dropdown when adding materials

---

## 👤 User Dashboard

### Day Cards View
- See all 30 days displayed as cards
- Visual indicators showing:
  - ✅ Completed days (green/checkmark)
  - 🔓 Current day (accessible, highlighted)
  - 🔒 Locked days (greyed out)
- Only Day 1 is unlocked initially

### Day Detail View
- Click an accessible day to view its materials
- Materials shown in admin-defined order
- **Progressive unlocking within each day:**
  - First material is accessible
  - Remaining materials are locked
  - Complete current material (submit form) → next unlocks
- After completing ALL materials in a day → next day unlocks

### Completed Materials
- Users can revisit any completed material anytime
- View previously submitted form responses

---

## 📊 Progress Tracking

- Track which materials each user has completed
- Track form submissions for each material
- Admin can view:
  - Overall progress per user
  - Completion percentage
  - Current active day
  - Last activity date

---

## 🎨 Design Style

- Professional & corporate appearance
- Clean, muted color palette
- Clear navigation and intuitive UI
- Responsive design for mobile and desktop

---

## 🛠 Technical Requirements

This app requires a **backend with database** for:
- User authentication and role management
- Storing course materials and form configurations
- Tracking user progress
- File storage for uploaded images, videos, and audio

We'll use **Lovable Cloud** (Supabase) to handle all backend needs including database, authentication, and file storage.

