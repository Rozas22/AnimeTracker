import sys
import re

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Modify fetchUserAnimeList to return allEntries
target_fetch = """        setCompletedAnime(allEntries);
      }
    } catch (err) {"""

replacement_fetch = """        setCompletedAnime(allEntries);
        return allEntries;
      }
    } catch (err) {"""

if target_fetch in code:
    code = code.replace(target_fetch, replacement_fetch)

# 2. Modify syncSupabaseUser to accept realEpisodes
target_sync = """  const syncSupabaseUser = async (viewer) => {
    try {
      console.log('Synchronizing user with Supabase:', viewer.id, viewer.name);
      
      const { data, error } = await supabase
        .from('users')
        .upsert({ 
          anilist_id: viewer.id.toString(), 
          username: viewer.name,
          anime_points: (viewer.statistics?.anime?.episodesWatched || 0) * 10
        }, { onConflict: 'anilist_id' })"""

replacement_sync = """  const syncSupabaseUser = async (viewer, realEpisodes) => {
    try {
      console.log('Synchronizing user with Supabase:', viewer.id, viewer.name, 'Real Episodes:', realEpisodes);
      
      const epsToUse = realEpisodes !== undefined ? realEpisodes : (viewer.statistics?.anime?.episodesWatched || 0);

      const { data, error } = await supabase
        .from('users')
        .upsert({ 
          anilist_id: viewer.id.toString(), 
          username: viewer.name,
          anime_points: epsToUse * 10
        }, { onConflict: 'anilist_id' })"""

if target_sync in code:
    code = code.replace(target_sync, replacement_sync)

# 3. Update the calls in fetchAnilistData (there are two: one in checkLoginState, one in handleLogin)
# Call 1 (checkLoginState around line 1050)
target_call1 = """      setUserData(viewer);
      await syncSupabaseUser(viewer);
      
      if (viewer.id) {
        await fetchUserAnimeList(viewer.id);"""

replacement_call1 = """      setUserData(viewer);
      
      if (viewer.id) {
        const animeEntries = await fetchUserAnimeList(viewer.id);
        let totalEpisodes = 0;
        if (animeEntries) {
          totalEpisodes = animeEntries.reduce((sum, entry) => {
            if (entry.status === 'COMPLETED' || entry.status === 'CURRENT') {
              return sum + (entry.progress || 0);
            }
            return sum;
          }, 0);
        }
        await syncSupabaseUser(viewer, totalEpisodes);
"""

if target_call1 in code:
    code = code.replace(target_call1, replacement_call1)

# Call 2 (handleLogin around line 1420)
target_call2 = """        const viewer = result.data.Viewer;
        setUserData(viewer);
        await syncSupabaseUser(viewer);
        await fetchUserAnimeList(viewer.id);"""

replacement_call2 = """        const viewer = result.data.Viewer;
        setUserData(viewer);
        const animeEntries = await fetchUserAnimeList(viewer.id);
        let totalEpisodes = 0;
        if (animeEntries) {
          totalEpisodes = animeEntries.reduce((sum, entry) => {
            if (entry.status === 'COMPLETED' || entry.status === 'CURRENT') {
              return sum + (entry.progress || 0);
            }
            return sum;
          }, 0);
        }
        await syncSupabaseUser(viewer, totalEpisodes);"""

if target_call2 in code:
    code = code.replace(target_call2, replacement_call2)


with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("App.jsx updated with real episodes calculation!")