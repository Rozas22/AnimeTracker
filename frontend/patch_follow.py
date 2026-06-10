import sys

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

target = """      const isNowFollowing = result.data.ToggleFollow.isFollowing;
      showToast(isNowFollowing ? 'Siguiendo al usuario' : 'Has dejado de seguir al usuario');
      
      await fetchAnilistFollowing();
    } catch (err) {"""

replacement = """      const isNowFollowing = result.data.ToggleFollow.isFollowing;
      showToast(isNowFollowing ? 'Siguiendo al usuario' : 'Has dejado de seguir al usuario');
      
      // Lógica de Idempotencia: Check de Unicidad antes de insertar en Supabase
      if (isNowFollowing && userData?.id) {
        try {
          const { data: existing } = await supabase
            .from('notifications')
            .select('id')
            .eq('type', 'FOLLOW')
            .eq('sender_id', userData.id.toString())
            .eq('receiver_id', parsedUserId.toString())
            .single();
            
          if (!existing) {
            await supabase.from('notifications').insert({
              type: 'FOLLOW',
              sender_id: userData.id.toString(),
              receiver_id: parsedUserId.toString()
            });
          }
        } catch (supaErr) {
          if (supaErr.code !== 'PGRST116') { // Ignoramos el error si simplemente no hay resultados (single throw)
             console.error('Error insertando notificación:', supaErr);
          } else if (supaErr.code === 'PGRST116') {
             // Es seguro insertar
             await supabase.from('notifications').insert({
              type: 'FOLLOW',
              sender_id: userData.id.toString(),
              receiver_id: parsedUserId.toString()
            });
          }
        }
      }
      
      await fetchAnilistFollowing();
    } catch (err) {"""

code = code.replace(target, replacement)

# 2. Add deduplication filter to frontend rendering
target_map = """                  socialNotifications.map(notif => ("""
replacement_map = """                  socialNotifications.filter((notif, index, self) => 
                    index === self.findIndex((t) => (
                      t.user?.id === notif.user?.id && t.type === notif.type && t.status === notif.status
                    ))
                  ).map(notif => ("""
code = code.replace(target_map, replacement_map)

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patched handleFollowUser and map filter!")