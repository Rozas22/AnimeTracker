import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oiovhnsxtpltftsvunsc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pb3ZobnN4dHBsdGZ0c3Z1bnNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMzI1MDIsImV4cCI6MjA5NjYwODUwMn0.--qShhtkC8ijuUYK6lFJ0A0vFZQ0sBgenbQXtvKSW9g';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
