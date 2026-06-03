const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const profileStart = code.indexOf("case 'profile':");
const profileEnd = code.indexOf("case 'settings':");

const friendStart = code.indexOf("case 'friend-profile': {");
const friendEnd = code.indexOf("case 'search':");

if (profileStart !== -1 && profileEnd !== -1 && friendStart !== -1 && friendEnd !== -1) {
  const newProfileCase =       case 'profile':
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
;

  const newFriendCase =       case 'friend-profile': {
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
                    className={\tn-primary \\}
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
;

  let newCode = code.substring(0, friendStart) + newFriendCase + code.substring(friendEnd);
  // Re-calculate profile start/end since code length changed
  const pStart = newCode.indexOf("case 'profile':");
  const pEnd = newCode.indexOf("case 'settings':");
  newCode = newCode.substring(0, pStart) + newProfileCase + newCode.substring(pEnd);

  fs.writeFileSync('src/App.jsx', newCode);
  console.log('Refactor complete');
} else {
  console.log('Could not find case boundaries');
}