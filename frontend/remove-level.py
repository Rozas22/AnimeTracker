import sys

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Remove level from syncSupabaseUser
target_sync = """        .upsert({ 
          anilist_id: viewer.id.toString(), 
          username: viewer.name,
          level: Math.max(1, calculateLevel(viewer.statistics?.anime?.episodesWatched || 0).computedLevel)
        }, { onConflict: 'anilist_id' })"""

replacement_sync = """        .upsert({ 
          anilist_id: viewer.id.toString(), 
          username: viewer.name 
        }, { onConflict: 'anilist_id' })"""

code = code.replace(target_sync, replacement_sync)

# 2. Remove level fetch from fetchFriendProfile
target_fetch = """        // Fetch level from Supabase
        try {
          const { data: supaData, error: supaErr } = await supabase
            .from('users')
            .select('level')
            .eq('anilist_id', user.id.toString())
            .single();
            
          if (!supaErr && supaData && supaData.level) {
            user.supabaseLevel = supaData.level;
          }
        } catch (e) {
          console.error("Error fetching friend level from Supabase", e);
        }"""

code = code.replace(target_fetch, "")

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Removed level from Supabase calls in App.jsx!")