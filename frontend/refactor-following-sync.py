import sys

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

target = """          const friendsList = data.data.Page.following;
          setAnilistFriends(friendsList);
          
          // Upsert friends into Supabase to ensure they exist for Arena
          try {
            const friendsToUpsert = friendsList.map(f => ({
              anilist_id: f.id.toString(),
              username: f.name
            }));
            const { error: syncErr } = await supabase
              .from('users')
              .upsert(friendsToUpsert, { onConflict: 'anilist_id' });
            if (syncErr) console.error("Error syncing friends to Supabase:", syncErr);
          } catch (e) {
            console.error("Exception syncing friends:", e);
          }"""

replacement = """          const friendsList = data.data.Page.following;
          
          // Upsert friends into Supabase and fetch their anime_points
          try {
            const friendsToUpsert = friendsList.map(f => ({
              anilist_id: f.id.toString(),
              username: f.name
            }));
            const { data: supaFriends, error: syncErr } = await supabase
              .from('users')
              .upsert(friendsToUpsert, { onConflict: 'anilist_id' })
              .select('anilist_id, anime_points');
              
            if (!syncErr && supaFriends) {
              const supaMap = {};
              supaFriends.forEach(row => supaMap[row.anilist_id] = row.anime_points);
              
              friendsList.forEach(friend => {
                const supaPts = supaMap[friend.id.toString()];
                if (supaPts > 0) {
                  // Supabase is the absolute source of truth
                  if (!friend.statistics) friend.statistics = { anime: {} };
                  if (!friend.statistics.anime) friend.statistics.anime = {};
                  friend.statistics.anime.episodesWatched = Math.floor(supaPts / 10);
                }
              });
            } else if (syncErr) {
              console.error("Error syncing friends to Supabase:", syncErr);
            }
          } catch (e) {
            console.error("Exception syncing friends:", e);
          }
          
          setAnilistFriends([...friendsList]);"""

code = code.replace(target, replacement)

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("fetchAnilistFollowing updated to read Supabase as source of truth!")