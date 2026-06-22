import { createClient } from '@supabase/supabase-js';

// Get these from process.env when executing
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

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
    // delay to respect rate limit
    await new Promise(r => setTimeout(r, 1000));
  }
  console.log("Forced update completed.");
}

run();