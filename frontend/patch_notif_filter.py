import sys

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update fetchSocialActivity signature
code = code.replace("const fetchSocialActivity = async () => {", "const fetchSocialActivity = async (viewerId) => {")

# 2. Add filter to fetchSocialActivity
target_fetch_loop = """        setSocialNotifications(prev => {
          let newNotifs = [...prev];
          uniqueActivities.forEach(act => {"""
replacement_fetch_loop = """        setSocialNotifications(prev => {
          let newNotifs = [...prev];
          uniqueActivities.filter(a => a.user?.id !== viewerId).forEach(act => {"""
code = code.replace(target_fetch_loop, replacement_fetch_loop)

# 3. Replace the calls
code = code.replace("const savedNotifs = localStorage.getItem('animeTrackerSocialNotifs'); if (!savedNotifs || JSON.parse(savedNotifs).length === 0) { await fetchSocialActivity(); }", "await fetchSocialActivity(viewer.id);")

# 4. Replace the render filter
target_render = "socialNotifications.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i).map(notif => ("
replacement_render = "socialNotifications.filter((notif, index, self) => notif.user?.id !== userData?.id && index === self.findIndex((t) => t.id === notif.id)).map(notif => ("
code = code.replace(target_render, replacement_render)

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patch applied successfully!")