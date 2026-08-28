/**
 * Environment configuration for Abu Hudhayfah HR & Contracts System
 * GitHub Actions injects Repository Secrets (SUPABASE_URL, SUPABASE_ANON_KEY) automatically during deployment.
 */
window.ENV = window.ENV || {
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
  REQUIRE_AUTH_ON_START: false
};
