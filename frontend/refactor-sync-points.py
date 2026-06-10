import sys

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

target_sync = """        .upsert({ 
          anilist_id: viewer.id.toString(), 
          username: viewer.name 
        }, { onConflict: 'anilist_id' })"""

replacement_sync = """        .upsert({ 
          anilist_id: viewer.id.toString(), 
          username: viewer.name,
          anime_points: (viewer.statistics?.anime?.episodesWatched || 0) * 10
        }, { onConflict: 'anilist_id' })"""

code = code.replace(target_sync, replacement_sync)

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("App.jsx syncSupabaseUser updated for anime_points!")