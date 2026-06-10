import sys

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

target = """        const user = result.data.User;
        setFriendData(user);"""

replacement = """        const user = result.data.User;
        
        // Fetch anime_points from Supabase as Source of Truth
        try {
          const { data: supaData, error: supaErr } = await supabase
            .from('users')
            .select('anime_points')
            .eq('anilist_id', user.id.toString())
            .single();
            
          if (!supaErr && supaData && supaData.anime_points > 0) {
            // Override with precise value from Supabase
            if (!user.statistics) user.statistics = { anime: {} };
            if (!user.statistics.anime) user.statistics.anime = {};
            user.statistics.anime.episodesWatched = Math.floor(supaData.anime_points / 10);
          }
        } catch (e) {
          console.error("Error fetching friend points from Supabase", e);
        }

        setFriendData(user);"""

if target in code:
    code = code.replace(target, replacement)
else:
    print("Could not find target string in fetchFriendProfile")

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("fetchFriendProfile updated to use Supabase anime_points!")