import sys

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

target_fetchSocial = """        const data = await response.json();
        if (!data.errors && data.data?.Page?.activities) {
          const activities = data.data.Page.activities.filter(a => a && a.user);
          setSocialNotifications(prev => {
            let newNotifs = [...prev];
            activities.forEach(act => {
              if (!newNotifs.some(n => n.id === act.id)) {
                newNotifs.unshift({ ...act, isRead: false });
              }
            });
            // Keep only latest 50 to avoid infinite growth
            const finalNotifs = newNotifs.slice(0, 50);
            localStorage.setItem('animeTrackerSocialNotifs', JSON.stringify(finalNotifs));
            return finalNotifs;
          });
        }
      } catch (err) {"""

# Wait, wait, let me check the exact string for target_fetchSocial using node because I might have it slightly wrong.