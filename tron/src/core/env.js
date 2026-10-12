/**
 * env.js - Client Runtime Environment Bridge for Tron Disc Arena.
 * Exposes live Supabase connection parameters to vanilla browser ES modules and global runtime.
 */

const DEFAULT_SUPABASE_URL = 'https://dugydwohgjcuwvimxcse.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1Z3lkd29oZ2pjdXd2aW14Y3NlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4MzEzOTksImV4cCI6MjEwNzQwNzM5OX0.86I5FeZzamB6Dk9i-JfDrl7ioHi-h4ahIsQdD535tVw';

export const ENV = {
  SUPABASE_URL: (typeof process !== 'undefined' && process.env?.SUPABASE_URL) ||
    (typeof window !== 'undefined' && window.__ENV__?.SUPABASE_URL) ||
    (typeof window !== 'undefined' && window.SUPABASE_URL) ||
    DEFAULT_SUPABASE_URL,
  SUPABASE_ANON_KEY: (typeof process !== 'undefined' && process.env?.SUPABASE_ANON_KEY) ||
    (typeof window !== 'undefined' && window.__ENV__?.SUPABASE_ANON_KEY) ||
    (typeof window !== 'undefined' && window.SUPABASE_ANON_KEY) ||
    DEFAULT_SUPABASE_ANON_KEY
};

if (typeof window !== 'undefined') {
  window.__ENV__ = window.__ENV__ || {};
  window.__ENV__.SUPABASE_URL = window.__ENV__.SUPABASE_URL || ENV.SUPABASE_URL;
  window.__ENV__.SUPABASE_ANON_KEY = window.__ENV__.SUPABASE_ANON_KEY || ENV.SUPABASE_ANON_KEY;
}
