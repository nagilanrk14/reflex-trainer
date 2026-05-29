// Initialize the Supabase client
const supabaseUrl = 'https://opxtpghosfcijxrrpngj.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9weHRwZ2hvc2ZjaWp4cnJwbmdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3Nzc3MTQsImV4cCI6MjA5NTM1MzcxNH0.h-X_JT-i_PjRX5wwJN6lwOk9SPI84ZeSJ1THjUY3oa0';

window.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
