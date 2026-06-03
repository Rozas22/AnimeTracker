import sys

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

profile_start = code.find("case 'profile':")
profile_end = code.find("case 'settings':")

friend_start = code.find("case 'friend-profile': {")
friend_end = code.find("case 'search':")

if profile_start == -1 or profile_end == -1 or friend_start == -1 or friend_end == -1:
    print("Could not find boundaries")
    sys.exit(1)

new_profile = '''      case 'profile':
        return (
          <ProfileDisplay
            user={userData}
            isOwnProfile={true}
            animeList={completedAnime}
            selectedFrame={selectedFrame}
            onTestAnimation={(stats) => {
              setLevelUpData({ level: stats.computedLevel, title: stats.userTitle, totalEps: stats.totalEpsForLevel });
              setShowLevelUpModal(true);
              confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, zIndex: 9999 });
            }}
            onTabClick={handleTabClick}
            onSubTabClick={setMylistSubTab}
          />
        );
'''

new_friend = '''      case 'friend-profile': {
        if (friendLoading) {
          return (
            <div style={{ textAlign: 'center', padding: '4rem' }}>
              <div className="loader"></div>
              <p style={{ color: 'var(--color-text-secondary)', marginTop: '1rem' }}>Cargando perfil de {viewedFriendUsername}...</p>
            </div>
          );
        }

        if (friendError || !friendData) {
          return (
            <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <ShieldAlert size={48} style={{ color: 'var(--color-accent-red)', marginBottom: '1rem', opacity: 0.8 }} />
              <h3>Error al cargar el perfil</h3>
              <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.5rem', marginBottom: '1.5rem' }}>{friendError || 'Usuario no encontrado.'}</p>
              <button className="btn-primary" onClick={() => handleTabClick('group')}>
                Volver al Grupo
              </button>
            </div>
          );
        }

        return (
          <ProfileDisplay
            user={friendData}
            isOwnProfile={false}
            animeList={friendAnimeList}
            onTabClick={handleTabClick}
            onSubTabClick={setFriendMylistSubTab}
          >
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Perfil de Miembro del Grupo</span>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="btn-secondary" onClick={() => handleTabClick('group')} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                  Volver al Grupo
                </button>
                {userData && userData.id !== friendData.id && (
                  <button 
                    className={"btn-primary" + (anilistFriends.some(f => f.id === friendData.id) ? ' following' : '')}
                    onClick={() => handleFollowUser(friendData.id)}
                    disabled={togglingFollow}
                    style={{ 
                      padding: '0.5rem 1.25rem', 
                      fontSize: '0.9rem',
                      background: anilistFriends.some(f => f.id === friendData.id) ? 'rgba(255,255,255,0.1)' : 'var(--color-anilist-blue)',
                      border: anilistFriends.some(f => f.id === friendData.id) ? '1px solid rgba(255,255,255,0.2)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    {togglingFollow ? (
                      <div className="loader" style={{ width: '14px', height: '14px', borderWidth: '2px' }}></div>
                    ) : anilistFriends.some(f => f.id === friendData.id) ? (
                      <><Check size={16} /> Siguiendo</>
                    ) : (
                      <><UserPlus size={16} /> Seguir en AniList</>
                    )}
                  </button>
                )}
              </div>
            </div>
          </ProfileDisplay>
        );
      }
'''

new_code = code[:friend_start] + new_friend + code[friend_end:]
p_start = new_code.find("case 'profile':")
p_end = new_code.find("case 'settings':")
new_code = new_code[:p_start] + new_profile + new_code[p_end:]

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(new_code)
print("Refactor complete")