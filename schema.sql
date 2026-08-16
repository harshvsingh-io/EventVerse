-- EventVerse Supabase Schema
-- Enforces multi-tenant isolation at the database level using Row Level Security (RLS)

-- 1. Colleges
CREATE TABLE colleges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    domain TEXT NOT NULL UNIQUE, -- e.g., 'mit.edu'
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 2. Users (extends auth.users, synced via triggers or manual insert)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    college_id UUID REFERENCES colleges(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'student', -- 'student' | 'club_admin' | 'college_admin' | 'super_admin'
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 3. Clubs
CREATE TABLE clubs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID REFERENCES colleges(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    logo_url TEXT,
    description TEXT,
    admin_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    last_ping_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 4. Ping Categories (Channels like Hackathons, Competitions)
CREATE TABLE ping_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID REFERENCES colleges(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL, -- e.g. '#F97316'
    icon TEXT, -- e.g. 'code', 'music'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(college_id, name)
);

-- 5. User Ping Subscriptions (Join Table)
CREATE TABLE user_ping_subscriptions (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    ping_category_id UUID REFERENCES ping_categories(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, ping_category_id)
);

-- 6. Events
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
    college_id UUID REFERENCES colleges(id) ON DELETE CASCADE,
    ping_category_id UUID REFERENCES ping_categories(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    banner_image_url TEXT,
    description TEXT,
    venue TEXT NOT NULL,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    registration_link TEXT,
    status TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'published'
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 7. Event Pings Log (Tracks notification fires)
CREATE TABLE event_pings_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
    sent_web BOOLEAN DEFAULT FALSE,
    sent_email BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 8. Event Likes
CREATE TABLE event_likes (
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (event_id, user_id)
);

-- 9. Event Comments
CREATE TABLE event_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 10. Event Saves
CREATE TABLE event_saves (
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (event_id, user_id)
);

-- 11. Community Posts (Reddit-style open board)
CREATE TABLE community_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID REFERENCES colleges(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 12. Community Comments
CREATE TABLE community_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 13. Community Reports
CREATE TABLE community_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
    reported_by UUID REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 14. Notifications Log (In-app notifications)
CREATE TABLE notifications_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    channel TEXT NOT NULL, -- 'web' | 'email'
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    read BOOLEAN DEFAULT FALSE
);

--------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enforces that users cannot see or query other college's data
--------------------------------------------------------------------------------

-- Enable RLS on all college-scoped tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ping_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ping_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_pings_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_log ENABLE ROW LEVEL SECURITY;

-- Helper to check user's college_id (stored in JWT metadata or queried from users)
-- In Supabase, we can configure a metadata sync to auth.users, or use a lookup function:
CREATE OR REPLACE FUNCTION get_user_college_id()
RETURNS UUID AS $$
    SELECT college_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- RLS Policies for Users
CREATE POLICY users_isolation_policy ON users
    FOR ALL USING (
        role = 'super_admin' OR 
        college_id = get_user_college_id() OR
        id = auth.uid()
    );

-- RLS Policies for Clubs
CREATE POLICY clubs_isolation_policy ON clubs
    FOR ALL USING (
        college_id = get_user_college_id()
    );

-- RLS Policies for Ping Categories
CREATE POLICY ping_categories_isolation_policy ON ping_categories
    FOR ALL USING (
        college_id = get_user_college_id()
    );

-- RLS Policies for User Ping Subscriptions
CREATE POLICY sub_isolation_policy ON user_ping_subscriptions
    FOR ALL USING (
        user_id = auth.uid()
    );

-- RLS Policies for Events
CREATE POLICY events_isolation_policy ON events
    FOR ALL USING (
        college_id = get_user_college_id()
    );

-- RLS Policies for Community Posts
CREATE POLICY posts_isolation_policy ON community_posts
    FOR ALL USING (
        college_id = get_user_college_id()
    );

-- RLS Policies for Notifications
CREATE POLICY notifications_isolation_policy ON notifications_log
    FOR ALL USING (
        user_id = auth.uid()
    );
