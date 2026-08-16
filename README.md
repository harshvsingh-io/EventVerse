# EventVerse 🚀
### *Your Campus. Your Universe of Events.*

> **"College event info is scattered across fragmented WhatsApp groups and Instagram stories — students miss events they'd actually attend. EventVerse gives every college its own isolated, notification-powered event universe."**

EventVerse is a multi-tenant university notification and event network built using **Next.js (App Router)**, **Tailwind CSS**, **Supabase**, and **Resend**. It enforces strict data isolation between campuses and protects student inboxes through a unique broadcast cooldown system.

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

## 🚀 Key Features

- **Multi-tenant Onboarding**: Landing selector whitelists campus domains and assigns user roles (Student, Organizer, Dean) immediately on signup.
- **Widescreen Admin Consoles**:
  - *Platform Super Admin*: Onboard campus domains without violating college-level data boundaries.
  - *College Dean (Admin)*: Invite/approve clubs, monitor flagged posts, custom-create channels, and override cooldowns during emergencies.
  - *Club Representative*: Build events, track ticking cooldown timers, and check engagement vector charts.
- **Chronological Flyer Feed**: Responsive feed supporting category filters, bookmarks, likes, shares, and search.
- **Community Forum**: General campus discussions supporting Reddit-style upvoting, inline comment drawers, and flag moderation.
- **Event Detail & Calendar**: Full layout details page with integrated client-side `.ics` download calendar invitation generators.
- **Preferences Panel**: Subscriptions manager enabling students to select or opt-out of notification categories anytime.

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

3. **Configure Environment Variables**:
   Create a `.env.local` file at the root:
   ```env
   # Add your Resend API Key for sending real emails
   RESEND_API_KEY=re_your_api_key_here
   ```

4. **Run the Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` inside your browser.

5. **Sandbox Test Mode**:
   - Register using your personal email.
   - Select the **Club Leader** role during onboarding to create your organization.
   - Create an event, click **Blast Ping**, tick **Notify via Email**, and check your real inbox! (Sandbox sends emails to the address registered on the Resend account).
