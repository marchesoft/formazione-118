// Configurazione Supabase
// Inserisci qui i dati del tuo progetto Supabase
const SUPABASE_URL = 'https://iwpfhxgijqeemvsyjhvy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3cGZoeGdpanFlZW12c3lqaHZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0ODEyNDEsImV4cCI6MjA4NjA1NzI0MX0.taGwXKQOIzthLi7Hm2hLsApeJU3nMwVz8y2RNr5U3Es';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
