import sys

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

target_fetch = """        if (data.data?.Page?.following) {
          setAnilistFriends(data.data.Page.following);
        }"""

replacement_fetch = """        if (data.data?.Page?.following) {
          const friendsList = data.data.Page.following;
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
          }
        }"""

code = code.replace(target_fetch, replacement_fetch)

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("App.jsx friends sync updated!")