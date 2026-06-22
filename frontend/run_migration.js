import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oiovhnsxtpltftsvunsc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pb3ZobnN4dHBsdGZ0c3Z1bnNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMzI1MDIsImV4cCI6MjA5NjYwODUwMn0.--qShhtkC8ijuUYK6lFJ0A0vFZQ0sBgenbQXtvKSW9g';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fetchRealEpisodes(anilistId) {
  const query = `
    query ($id: Int) {
      User(id: $id) {
        statistics {
          anime {
            episodesWatched
          }
        }
      }
    }
  `;
  try {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { id: parseInt(anilistId) } })
    });
    const data = await res.json();
    return data.data?.User?.statistics?.anime?.episodesWatched || null;
  } catch(e) {
    console.error(`Error fetching episodes for user ${anilistId}:`, e);
    return null;
  }
}

async function run() {
  console.log("Starting forced update...");
  const { data: users, error } = await supabase.from('users').select('anilist_id, username');
  if (error) {
    console.error("Error fetching users:", error);
    return;
  }
  
  console.log(`Found ${users.length} users in database.`);
  
  for (const user of users) {
    console.log(`Checking ${user.username} (${user.anilist_id})...`);
    const eps = await fetchRealEpisodes(user.anilist_id);
    if (eps !== null) {
      const anime_points = eps * 10;
      const { error: updateErr } = await supabase.from('users').update({
        anime_points: anime_points,
        last_updated_at: new Date().toISOString()
      }).eq('anilist_id', user.anilist_id);
      
      if (updateErr) {
         console.error(`Failed to update ${user.username}:`, updateErr);
      } else {
         console.log(`Successfully updated ${user.username} to ${anime_points} anime points.`);
      }
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  console.log("Forced update completed.");
}

run();