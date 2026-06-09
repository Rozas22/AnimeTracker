import sys

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update fetchAnilistFollowing signature and logic
target_fetch_following = """  const fetchAnilistFollowing = async () => {
    if (!token) {
      console.log('Token presente:', false);
      return;
    }
    console.log('Token presente:', true);

    const userId = userData?.id;"""

replacement_fetch_following = """  const fetchAnilistFollowing = async (overrideUserId = null) => {
    if (!token) {
      console.log('Token presente:', false);
      return;
    }
    console.log('Token presente:', true);

    const userId = overrideUserId || userData?.id;"""

code = code.replace(target_fetch_following, replacement_fetch_following)

# 2. Pass viewer.id in fetchUserData
target_fetch_user_data = """      if (viewer.id) {
        await fetchUserAnimeList(viewer.id);
        await fetchAnilistFollowing();
        await fetchSocialActivity();
      }"""

replacement_fetch_user_data = """      if (viewer.id) {
        await fetchUserAnimeList(viewer.id);
        await fetchAnilistFollowing(viewer.id);
        await fetchSocialActivity();
      }"""

code = code.replace(target_fetch_user_data, replacement_fetch_user_data)

# 3. Add fetchAnilistFollowing in handleCallback
target_handle_callback = """        setUserData(viewer);
        await syncSupabaseUser(viewer);
        await fetchUserAnimeList(viewer.id);
      } catch (err) {"""

replacement_handle_callback = """        setUserData(viewer);
        await syncSupabaseUser(viewer);
        await fetchUserAnimeList(viewer.id);
        await fetchAnilistFollowing(viewer.id);
        await fetchSocialActivity();
      } catch (err) {"""

code = code.replace(target_handle_callback, replacement_handle_callback)

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("fetchAnilistFollowing fixed!")