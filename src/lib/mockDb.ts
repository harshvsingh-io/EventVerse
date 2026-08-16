// EventVerse Local Database & Supabase Fallback Client
// Implements full database operations with localStorage persistence.
// Simulates tenant isolation (RLS) based on college_id.

export interface College {
  id: string;
  name: string;
  domain: string;
  status: 'pending' | 'approved';
  createdAt: string;
}

export interface User {
  id: string;
  collegeId: string;
  name: string;
  email: string;
  role: 'student' | 'club_admin' | 'college_admin' | 'super_admin';
  emailVerified: boolean;
  createdAt: string;
}

export interface Club {
  id: string;
  collegeId: string;
  name: string;
  logoUrl: string;
  description: string;
  adminUserId: string;
  lastPingSentAt: string | null;
  createdAt: string;
}

export interface PingCategory {
  id: string;
  collegeId: string;
  name: string;
  color: string;
  icon: string;
  createdAt: string;
}

export interface Event {
  id: string;
  clubId: string;
  collegeId: string;
  pingCategoryId: string;
  title: string;
  bannerImageUrl: string;
  description: string;
  venue: string;
  eventDate: string;
  registrationLink: string;
  status: 'draft' | 'published';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  likesCount?: number;
  commentsCount?: number;
}

export interface EventPingLog {
  id: string;
  eventId: string;
  clubId: string;
  sentWeb: boolean;
  sentEmail: boolean;
  sentAt: string;
}

export interface EventComment {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  userRole: string;
  body: string;
  createdAt: string;
}

export interface CommunityPost {
  id: string;
  collegeId: string;
  userId: string;
  userName: string;
  userRole: string;
  title: string;
  body: string;
  imageUrl?: string;
  likes: string[]; // User IDs who liked
  flagged?: boolean;
  createdAt: string;
}

export interface CommunityComment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userRole: string;
  body: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  eventId?: string;
  title: string;
  message: string;
  channel: 'web' | 'email';
  sentAt: string;
  read: boolean;
}

// Seed Data
const DEFAULT_COLLEGES: College[] = [
  { id: 'c1', name: 'Manipal University Jaipur (MUJ)', domain: 'jaipur.manipal.edu', status: 'approved', createdAt: new Date().toISOString() },
  { id: 'c2', name: 'Stanford University', domain: 'stanford.edu', status: 'approved', createdAt: new Date().toISOString() },
  { id: 'c3', name: 'MIT', domain: 'mit.edu', status: 'approved', createdAt: new Date().toISOString() },
  { id: 'c4', name: 'IIT Delhi', domain: 'iitd.ac.in', status: 'pending', createdAt: new Date().toISOString() }
];

const DEFAULT_CATEGORIES: PingCategory[] = [
  // College 1 (MUJ)
  { id: 'cat-h1', collegeId: 'c1', name: 'Hackathons', color: '#F97316', icon: 'code', createdAt: new Date().toISOString() },
  { id: 'cat-c1', collegeId: 'c1', name: 'Competitions', color: '#A855F7', icon: 'trophy', createdAt: new Date().toISOString() },
  { id: 'cat-m1', collegeId: 'c1', name: 'Music & Cultural', color: '#EC4899', icon: 'music', createdAt: new Date().toISOString() },
  { id: 'cat-t1', collegeId: 'c1', name: 'Tech Talks', color: '#3B82F6', icon: 'presentation', createdAt: new Date().toISOString() },
  { id: 'cat-s1', collegeId: 'c1', name: 'Sports', color: '#22C55E', icon: 'activity', createdAt: new Date().toISOString() },
  { id: 'cat-cr1', collegeId: 'c1', name: 'Career & Networking', color: '#14B8A6', icon: 'briefcase', createdAt: new Date().toISOString() },
  
  // College 2 (Stanford)
  { id: 'cat-h2', collegeId: 'c2', name: 'Hackathons', color: '#F97316', icon: 'code', createdAt: new Date().toISOString() },
  { id: 'cat-t2', collegeId: 'c2', name: 'Tech Talks', color: '#3B82F6', icon: 'presentation', createdAt: new Date().toISOString() }
];

const DEFAULT_USERS: User[] = [
  // Super Admin
  { id: 'u-super', collegeId: 'c1', name: 'Super Admin', email: 'super@eventverse.com', role: 'super_admin', emailVerified: true, createdAt: new Date().toISOString() },
  // MUJ users
  { id: 'u-muj-admin', collegeId: 'c1', name: 'Dr. Ramesh Kumar', email: 'admin@jaipur.manipal.edu', role: 'college_admin', emailVerified: true, createdAt: new Date().toISOString() },
  { id: 'u-coding-admin', collegeId: 'c1', name: 'Aarav Mehta', email: 'codingclub@jaipur.manipal.edu', role: 'club_admin', emailVerified: true, createdAt: new Date().toISOString() },
  { id: 'u-music-admin', collegeId: 'c1', name: 'Riya Sen', email: 'musicclub@jaipur.manipal.edu', role: 'club_admin', emailVerified: true, createdAt: new Date().toISOString() },
  { id: 'u-student1', collegeId: 'c1', name: 'Kabir Verma', email: 'kabir.verma@learner.manipal.edu', role: 'student', emailVerified: true, createdAt: new Date().toISOString() },
  { id: 'u-student2', collegeId: 'c1', name: 'Ananya Sharma', email: 'ananya.sharma@learner.manipal.edu', role: 'student', emailVerified: true, createdAt: new Date().toISOString() }
];

const DEFAULT_CLUBS: Club[] = [
  { id: 'club1', collegeId: 'c1', name: 'MUJ Coding Club', logoUrl: 'https://images.unsplash.com/photo-1618401471353-b98aedd07871?w=100&auto=format&fit=crop&q=60', description: 'The hub for developers, open source contributors, and hackathon lovers at MUJ.', adminUserId: 'u-coding-admin', lastPingSentAt: new Date(Date.now() - 50 * 60 * 60 * 1000).toISOString(), createdAt: new Date().toISOString() },
  { id: 'club2', collegeId: 'c1', name: 'Symphony: The Music Society', logoUrl: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=100&auto=format&fit=crop&q=60', description: 'Bringing rhythm, melody, and rock to the halls of MUJ. Classical to Pop.', adminUserId: 'u-music-admin', lastPingSentAt: null, createdAt: new Date().toISOString() }
];

const DEFAULT_EVENTS: Event[] = [
  {
    id: 'e1',
    clubId: 'club1',
    collegeId: 'c1',
    pingCategoryId: 'cat-h1',
    title: 'Nebula Hack 2026',
    bannerImageUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&auto=format&fit=crop&q=60',
    description: 'EventVerse presents Nebula Hack! A 36-hour sprint where you build cosmic-scale applications. Winners get 1 Lakh INR prize pool and mentorship from top companies. Food, energy drinks, and swag bags provided. Team size: 1-4.',
    venue: 'Academic Block 2, Ground Floor Lab',
    eventDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    registrationLink: 'https://nebulahack.muj.dev',
    status: 'published',
    createdBy: 'u-coding-admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'e2',
    clubId: 'club2',
    collegeId: 'c1',
    pingCategoryId: 'cat-m1',
    title: 'Acoustic Sunset Jam',
    bannerImageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=60',
    description: 'Unwind after classes with live acoustic performances by our top student bands. Bring your acoustic instruments if you want to join the open stage! Snacks and hot beverages will be served.',
    venue: 'Central Amphitheater (Dome Area)',
    eventDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    registrationLink: 'https://symphony.muj.dev/sunset',
    status: 'published',
    createdBy: 'u-music-admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'e3',
    clubId: 'club1',
    collegeId: 'c1',
    pingCategoryId: 'cat-t1',
    title: 'Intro to Agentic Coding with Gemini 3.5',
    bannerImageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=60',
    description: 'Learn how to use Advanced Agentic AI frameworks to automate software engineering workflows. We will build a small project during the workshop and share reference resources.',
    venue: 'Seminar Hall 3',
    eventDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    registrationLink: 'https://codingclub.muj.dev/ai-workshop',
    status: 'draft',
    createdBy: 'u-coding-admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const DEFAULT_POSTS: CommunityPost[] = [
  {
    id: 'p1',
    collegeId: 'c1',
    userId: 'u-student1',
    userName: 'Kabir Verma',
    userRole: 'student',
    title: 'When are the end-semester exams starting?',
    body: 'Does anyone have the official schedule for the end-sem exams? The academic calendar says Nov 15 but I heard it might get pushed back due to Diwali holidays. Please share if you have any updates!',
    likes: ['u-student2', 'u-coding-admin'],
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'p2',
    collegeId: 'c1',
    userId: 'u-student2',
    userName: 'Ananya Sharma',
    userRole: 'student',
    title: 'Mess food today was actually decent!',
    body: 'Am I dreaming or did the hostel mess actually serve good Paneer Butter Masala and hot Jalebis today? Huge shoutout to the kitchen staff, hope it stays like this.',
    likes: ['u-student1'],
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()
  }
];

class LocalDatabase {
  private getStorageItem<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined') return defaultValue;
    const item = localStorage.getItem(key);
    if (!item) {
      localStorage.setItem(key, JSON.stringify(defaultValue));
      return defaultValue;
    }
    try {
      return JSON.parse(item);
    } catch {
      return defaultValue;
    }
  }

  private setStorageItem<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
  }

  // Raw gets
  getColleges(): College[] { return this.getStorageItem('ev_colleges', DEFAULT_COLLEGES); }
  getUsers(): User[] { return this.getStorageItem('ev_users', DEFAULT_USERS); }
  getClubs(): Club[] { return this.getStorageItem('ev_clubs', DEFAULT_CLUBS); }
  getCategories(): PingCategory[] { return this.getStorageItem('ev_categories', DEFAULT_CATEGORIES); }
  getEvents(): Event[] { return this.getStorageItem('ev_events', DEFAULT_EVENTS); }
  getPosts(): CommunityPost[] { return this.getStorageItem('ev_posts', DEFAULT_POSTS); }
  getPostComments(): CommunityComment[] { return this.getStorageItem('ev_post_comments', []); }
  getEventComments(): EventComment[] { return this.getStorageItem('ev_event_comments', []); }
  getSubscriptions(): { userId: string; categoryId: string }[] { return this.getStorageItem('ev_subscriptions', [
    { userId: 'u-student1', categoryId: 'cat-h1' },
    { userId: 'u-student1', categoryId: 'cat-m1' },
    { userId: 'u-student2', categoryId: 'cat-h1' }
  ]); }
  getLikes(): { userId: string; eventId: string }[] { return this.getStorageItem('ev_likes', [
    { userId: 'u-student1', eventId: 'e1' },
    { userId: 'u-student2', eventId: 'e1' }
  ]); }
  getSaves(): { userId: string; eventId: string }[] { return this.getStorageItem('ev_saves', [
    { userId: 'u-student1', eventId: 'e1' }
  ]); }
  getNotifications(): Notification[] { return this.getStorageItem('ev_notifications', []); }

  // Setters
  setColleges(c: College[]) { this.setStorageItem('ev_colleges', c); }
  setUsers(u: User[]) { this.setStorageItem('ev_users', u); }
  setClubs(cl: Club[]) { this.setStorageItem('ev_clubs', cl); }
  setCategories(cat: PingCategory[]) { this.setStorageItem('ev_categories', cat); }
  setEvents(ev: Event[]) { this.setStorageItem('ev_events', ev); }
  setPosts(p: CommunityPost[]) { this.setStorageItem('ev_posts', p); }
  setPostComments(c: CommunityComment[]) { this.setStorageItem('ev_post_comments', c); }
  setEventComments(ec: EventComment[]) { this.setStorageItem('ev_event_comments', ec); }
  setSubscriptions(subs: { userId: string; categoryId: string }[]) { this.setStorageItem('ev_subscriptions', subs); }
  setLikes(l: { userId: string; eventId: string }[]) { this.setStorageItem('ev_likes', l); }
  setSaves(s: { userId: string; eventId: string }[]) { this.setStorageItem('ev_saves', s); }
  setNotifications(n: Notification[]) { this.setStorageItem('ev_notifications', n); }

  // Auth Operations
  getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;
    const session = localStorage.getItem('ev_session');
    if (!session) return null;
    try {
      const parsed = JSON.parse(session);
      // Verify user still exists in the local database
      const users = this.getUsers();
      return users.find(u => u.id === parsed.id) || null;
    } catch {
      return null;
    }
  }

  setCurrentUser(user: User | null) {
    if (typeof window === 'undefined') return;
    if (user) {
      localStorage.setItem('ev_session', JSON.stringify(user));
    } else {
      localStorage.removeItem('ev_session');
    }
  }

  login(email: string, otp: string): { success: boolean; user?: User; error?: string } {
    const users = this.getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      return { success: false, error: 'Email not registered. Please sign up first!' };
    }
    
    if (otp !== '123456') { // Mock OTP check
      return { success: false, error: 'Incorrect OTP. Use "123456" for demo login.' };
    }

    this.setCurrentUser(user);
    return { success: true, user };
  }

  signup(name: string, email: string, collegeId: string): { success: boolean; user?: User; error?: string } {
    const users = this.getUsers();
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, error: 'Email is already registered!' };
    }

    const college = this.getColleges().find(c => c.id === collegeId);
    if (!college) {
      return { success: false, error: 'College not found.' };
    }

    // Verify email domain match (personal emails whitelisted for sandbox/demo tests)
    const emailDomain = email.split('@')[1].toLowerCase();
    const isPersonalEmail = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com"].includes(emailDomain);
    
    if (
      emailDomain !== college.domain.toLowerCase() && 
      !email.endsWith('.manipal.edu') && 
      !email.endsWith('eventverse.com') &&
      !isPersonalEmail
    ) {
      return { success: false, error: `Email domain must match the college whitelist domain: @${college.domain}` };
    }

    const newUser: User = {
      id: 'u-' + Math.random().toString(36).substr(2, 9),
      collegeId,
      name,
      email,
      role: 'student',
      emailVerified: true, // Auto verify for demo after signup
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    this.setUsers(users);
    this.setCurrentUser(newUser);
    return { success: true, user: newUser };
  }

  // Tenant Isolated Query helpers (RLS Simulator)
  getIsolatedEvents(collegeId: string): Event[] {
    const events = this.getEvents();
    const likes = this.getLikes();
    const comments = this.getEventComments();
    
    return events
      .filter(e => e.collegeId === collegeId)
      .map(e => ({
        ...e,
        likesCount: likes.filter(l => l.eventId === e.id).length,
        commentsCount: comments.filter(c => c.eventId === e.id).length
      }));
  }

  getIsolatedCategories(collegeId: string): PingCategory[] {
    return this.getCategories().filter(c => c.collegeId === collegeId);
  }

  getIsolatedClubs(collegeId: string): Club[] {
    return this.getClubs().filter(c => c.collegeId === collegeId);
  }

  getIsolatedPosts(collegeId: string): CommunityPost[] {
    return this.getPosts().filter(p => p.collegeId === collegeId);
  }

  // Cooldown Manager (48h rule)
  getCooldownRemaining(clubId: string): { remainingMs: number; isBlocked: boolean; formatted: string } {
    const club = this.getClubs().find(c => c.id === clubId);
    if (!club || !club.lastPingSentAt) {
      return { remainingMs: 0, isBlocked: false, formatted: '' };
    }

    const COOLDOWN_DURATION = 48 * 60 * 60 * 1000; // 48 hours in ms
    const lastSent = new Date(club.lastPingSentAt).getTime();
    const nextAvailable = lastSent + COOLDOWN_DURATION;
    const now = Date.now();
    
    if (now >= nextAvailable) {
      return { remainingMs: 0, isBlocked: false, formatted: '' };
    }

    const remaining = nextAvailable - now;
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    
    return {
      remainingMs: remaining,
      isBlocked: true,
      formatted: `${hours}h ${minutes}m`
    };
  }

  // Trigger Notifications
  sendEventNotification(eventId: string, categoryId: string, notifyWeb: boolean, notifyEmail: boolean, bypassCooldown: boolean = false): { success: boolean; error?: string } {
    const events = this.getEvents();
    const event = events.find(e => e.id === eventId);
    if (!event) return { success: false, error: 'Event not found' };

    const clubs = this.getClubs();
    const clubIndex = clubs.findIndex(c => c.id === event.clubId);
    if (clubIndex === -1) return { success: false, error: 'Club not found' };

    const club = clubs[clubIndex];

    // Verify Cooldown (unless bypassed by College Admin)
    if (!bypassCooldown) {
      const cd = this.getCooldownRemaining(club.id);
      if (cd.isBlocked) {
        return { success: false, error: `Club ping is on a cooldown. Next ping available in ${cd.formatted}` };
      }
    }

    // Update club ping timestamp
    clubs[clubIndex] = {
      ...club,
      lastPingSentAt: new Date().toISOString()
    };
    this.setClubs(clubs);

    // Get all users subscribed to this category
    const subs = this.getSubscriptions().filter(s => s.categoryId === categoryId);
    const users = this.getUsers().filter(u => u.collegeId === event.collegeId);
    const notifications = this.getNotifications();

    const subscribedUserIds = new Set(subs.map(s => s.userId));
    const targetUsers = users.filter(u => subscribedUserIds.has(u.id));

    // Send notifications
    targetUsers.forEach(user => {
      if (notifyWeb) {
        notifications.unshift({
          id: 'n-' + Math.random().toString(36).substr(2, 9),
          userId: user.id,
          eventId: event.id,
          title: `New event in ${this.getCategories().find(c => c.id === categoryId)?.name || 'Events'}`,
          message: `"${event.title}" has been announced by ${club.name}. Check details!`,
          channel: 'web',
          sentAt: new Date().toISOString(),
          read: false
        });
      }
      if (notifyEmail) {
        notifications.unshift({
          id: 'n-' + Math.random().toString(36).substr(2, 9),
          userId: user.id,
          eventId: event.id,
          title: `New event in ${this.getCategories().find(c => c.id === categoryId)?.name || 'Events'}`,
          message: `"${event.title}" has been announced by ${club.name}. Check details!`,
          channel: 'email',
          sentAt: new Date().toISOString(),
          read: true // Simulated email
        });
        
        // Log a browser console simulated email
        console.log(`[SIMULATED EMAIL] Sending notification to ${user.email} (Resend Sandbox) -> ${event.title}`);
      }
    });

    this.setNotifications(notifications);
    return { success: true };
  }
}

export const db = new LocalDatabase();
