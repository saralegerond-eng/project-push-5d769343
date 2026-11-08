const SUPABASE_URL = "https://oracxtebsabbrwgemlts.supabase.co";
const SUPABASE_KEY = "sb_publishable_zOpTWQczG4mEM_AgiDAjIQ_ktIQaa77";
const createClient = window.supabase.createClient;
window.bonchoixDb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
