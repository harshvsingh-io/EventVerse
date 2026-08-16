// Main database interface
// Swappable between Supabase client and local storage database

import { db as mockDb } from './mockDb';

export const db = mockDb;
export * from './mockDb';
