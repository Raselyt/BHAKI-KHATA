
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://muqtcgiqlgbdlwnpzxti.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11cXRjZ2lxbGdiZGx3bnB6eHRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3NjczNjcsImV4cCI6MjA4NTM0MzM2N30.cZ1_qAMZtq-n5g6qKOkADZipk-dUf7gcXAdOa6Ku8y4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
