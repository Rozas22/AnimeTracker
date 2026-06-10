import sys

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

target1 = """      setUserData(viewer);
      
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
        await syncSupabaseUser(viewer, totalEpisodes);"""

replacement1 = """      
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
        
        // Patch viewer data with real episodes for ProfileHeader
        if (!viewer.statistics) viewer.statistics = { anime: {} };
        if (!viewer.statistics.anime) viewer.statistics.anime = {};
        viewer.statistics.anime.episodesWatched = totalEpisodes;
        
        setUserData(viewer);
        await syncSupabaseUser(viewer, totalEpisodes);"""

if target1 in code:
    code = code.replace(target1, replacement1)

target2 = """        const viewer = result.data.Viewer;
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

replacement2 = """        const viewer = result.data.Viewer;
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
        
        // Patch viewer data with real episodes
        if (!viewer.statistics) viewer.statistics = { anime: {} };
        if (!viewer.statistics.anime) viewer.statistics.anime = {};
        viewer.statistics.anime.episodesWatched = totalEpisodes;
        
        setUserData(viewer);
        await syncSupabaseUser(viewer, totalEpisodes);"""

if target2 in code:
    code = code.replace(target2, replacement2)

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("App.jsx patched userData with real episodes!")