# EventVerse 🚀
### *Your Campus. Your Universe of Events.*

> **"College event info is scattered across fragmented WhatsApp groups and Instagram stories — students miss events they'd actually attend. EventVerse gives every college its own isolated, notification-powered event universe."**

EventVerse is a multi-tenant university notification and event network built using **Next.js (App Router)**, **Tailwind CSS**, **Supabase**, and **Resend**. It enforces strict data isolation between campuses and protects student inboxes through a unique broadcast cooldown system.

---

## 🔑 Demo Login & Testing Guide (For Judges)

Every role on EventVerse has a pre-configured demo account. 
*   **Verification Code / OTP for all accounts:** `123456`

| Role | Demo Email Address | Purpose & Dashboard Access |
| :--- | :--- | :--- |
| **Super Admin** | `super@eventverse.com` | Cross-college registry, whitelists, and domain onboarding. |
| **College Admin (Dean)** | `admin@jaipur.manipal.edu` | Club approvals, category creations, discussion moderation queue, and emergency cooldown overrides. |
| **Club Leader (Coding)** | `codingclub@jaipur.manipal.edu` | CRUD events, 48h ping cooldown locks, and view engagement vector charts. |
| **Club Leader (Music)** | `musicclub@jaipur.manipal.edu` | Alternate club representative panel. |
| **Campus Student A** | `kabir.verma@learner.manipal.edu` | Chronological flyer feed, bookmark saves, comments, upvotes, and subscription settings. |
| **Campus Student B** | `ananya.sharma@learner.manipal.edu` | Alternate student account for testing upvote counters. |

---

## 🚀 How to Test the 1-Click Email & Notification System

EventVerse supports a **dual notification pipeline** (In-app Web DMs + SMTP Resend Emails). You can test this loop using the following steps:

### Loop 1: Testing In-App Web Alerts (No Setup Required)
1. Log in as **Campus Student A** (`kabir.verma@learner.manipal.edu` / OTP: `123456`). Go to **Settings** and ensure you are subscribed to **"Hackathons"** or **"Music & Cultural"** pings.
2. Logout, and log in as the **Club Leader (Coding)** (`codingclub@jaipur.manipal.edu` / OTP: `123456`).
3. Click **"Blast Ping"** next to a published event, tick **"Notify on Web"**, and click **"Fire Broadcast"**.
4. Log back into **Student A**'s account. The top navigation bell will glow with an unread badge. Click it to view the notification DM and tap to navigate to the event details.

### Loop 2: Testing Real Emails (1-Click Delivery)
1. Make sure your Resend API Key is added inside the `.env.local` file at the root:
   ```env
   RESEND_API_KEY=re_your_api_key
   ```
2. Restart the local server (`npm run dev`).
3. Register/Sign up on the home screen using the **real email address** you registered on your Resend developer dashboard (sandbox only permits sending to your own registered account).
4. Select the **"Club Representative"** role on signup and configure your club details.
5. Create a new event, click **"Blast Ping"**, check **"Notify via Email"**, and click **"Fire Broadcast"**.
6. Check your real mailbox! You will receive a responsive HTML email containing the vertical flyer banner, details grid, and active registration button.

---

## 🌟 Pitch Points for Judges

1. **Strict Tenant Data Isolation**: Enforced at the Postgres database level using **Row Level Security (RLS)**. Student accounts are scoped by `college_id` via JWT parameters - a user from College A can never read or query announcements belonging to College B.
2. **Zero-Spam Cooldown Rule**: Campus notification blasts (Web DM + Resend email templates) are capped at **once per club per 48 hours**. This product decision prevents inbox fatigue and forces clubs to consolidate announcements into consolidated email digests.
3. **Crafted Visual Layout (1080x1350)**: An aspect-ratio layout (`aspect-[4/5]`) renders portrait flyer banners fully without cropping, preserving the physical poster designs of student organizers.
4. **Dual Backend Architecture**: Includes a persistent client-side database service (`localStorage` state manager) replicating all schemas, isolation bounds, and logs out-of-the-box, alongside real Supabase and Resend SMTP connections.

---

## 🛠️ Technology Stack
- **Frontend Framework**: Next.js 15 (App Router) & TypeScript
- **Styling & Theme**: Tailwind CSS v4 (Cosmic Dark System, Glassmorphism, animations)
- **Database & Auth**: Supabase (Postgres with custom RLS SQL policies)
- **Notifications**: Resend REST API (styled transactional email templates)
- **Icons**: Lucide React

---

## 📂 Project Structure
```
eventverse/
├── src/
│   ├── app/
│   │   ├── api/send-ping/route.ts  # Resend email handler endpoint
│   │   ├── community/page.tsx      # Reddit-style student board
│   │   ├── dashboard/
│   │   │   ├── club/page.tsx       # Club representative dashboard
│   │   │   ├── college/page.tsx    # College dean moderation panel
│   │   │   └── super/page.tsx      # Platform admin panel
│   │   ├── events/[id]/page.tsx    # Event details & .ics generator
│   │   ├── feed/page.tsx           # Flyer feed & directories
│   │   ├── settings/page.tsx       # Subscription settings
│   │   ├── globals.css             # Cosmic design system rules
│   │   ├── layout.tsx              # Google fonts setup
│   │   └── page.tsx                # Onboarding & signup auth card
│   ├── components/
│   │   └── Header.tsx              # Bell notifications inbox
│   └── lib/
│       ├── db.ts                   # Unified database entrypoint
│       └── mockDb.ts               # LocalStorage persistent simulator
├── schema.sql                      # Supabase RLS database schema
└── .env.local                      # Key configurations
```

---

## ⚙️ Setup & Local Installation

1. **Clone the repository**:
   ```bash
   git clone <your-repository-url>
   cd eventverse
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` inside your browser.
