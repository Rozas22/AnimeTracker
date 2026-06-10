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
          level: Math.max(1, calculateLevel(viewer.statistics?.anime?.episodesWatched || 0).computedLevel)
        }, { onConflict: 'anilist_id' })"""

if target_sync in code:
    code = code.replace(target_sync, replacement_sync)
    with open('src/App.jsx', 'w', encoding='utf-8') as f:
        f.write(code)
    print("syncSupabaseUser updated!")
else:
    print("Could not find target_sync")