import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yjrqpjlzyxivwpfcatvt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqcnFwamx6eXhpdndwZmNhdHZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMTgwNzIsImV4cCI6MjA4ODg5NDA3Mn0.8OLnhISJn6z07yZJIqrSouvb7m9kf1htQukWdeTClH8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('proposals').select('*').limit(1);
  if (error) {
    console.error('Error fetching proposals:', error);
  } else {
    console.log('Columns of proposals:', Object.keys(data[0] || {}));
  }
}
run();
