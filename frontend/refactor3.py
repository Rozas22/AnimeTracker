import sys

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Inject ProfileDisplay before App
app_start = code.find("export default function App() {")

components = '''const CollapsibleSection = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  return (
    <div style={{ marginTop: '2rem', width: '100%' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '1rem' }}
      >
        <h3 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--color-text-primary)' }}>{title}</h3>
        {isOpen ? <ChevronUp size={20} color="var(--color-text-secondary)" /> : <ChevronDown size={20} color="var(--color-text-secondary)" />}
      </div>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ProfileDisplay = ({ 
  user, 
  isOwnProfile, 
  animeList, 
  selectedFrame, 
  onTestAnimation, 
  children,
  onTabClick,
  onSubTabClick
}) => {
  if (!user) return null;

  const isDesktop = window.innerWidth >= 768;
  const totalEpsForLevel = user.statistics?.anime?.episodesWatched || animeList.reduce((s, e) => s + (e.progress || 0), 0);
  const { computedLevel } = calculateLevelStats(totalEpsForLevel);

  return (
    <div className="card profile-card" style={{ position: 'relative' }}>
      {children && <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>{children}</div>}

      <div className="profile-layout-grid">
        <div className="profile-col-left">
          <ProfileHeader 
            user={user} 
            isPublic={!isOwnProfile} 
            selectedFrame={selectedFrame} 
            onTestAnimation={onTestAnimation}
          />

          {user.about && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem', width: '100%', marginTop: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', color: 'var(--color-text-primary)' }}>Sobre {user.name}</h3>
              <div 
                style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem' }} 
                dangerouslySetInnerHTML={{ __html: user.about }}
              />
            </div>
          )}

          {(() => {
            const watching = animeList
              .filter(e => e.status === 'CURRENT')
              .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
            if (!watching) return null;
            const pct = watching.media?.episodes
              ? Math.round((watching.progress / watching.media.episodes) * 100)
              : null;
            return (
              <div className="profile-now-card" style={{ marginTop: '1.5rem' }}>
                <div className="profile-now-badge">
                  <Play size={12} style={{ marginRight: '4px' }} /> VIENDO AHORA
                </div>
                <div className="profile-now-body">
                  <img
                    src={watching.media?.coverImage?.large}
                    alt={watching.media?.title?.userPreferred}
                    className="profile-now-cover"
                    onClick={() => { onTabClick('mylist'); onSubTabClick('CURRENT'); }}
                    style={{ cursor: 'pointer' }}
                  />
                  <div className="profile-now-info">
                    <p className="profile-now-title">{watching.media?.title?.userPreferred}</p>
                    <p className="profile-now-progress">
                      Episodio {watching.progress}{watching.media?.episodes ? " / " + watching.media.episodes : ''}
                    </p>
                    {pct !== null && (
                      <div className="profile-now-bar-track">
                        <div className="profile-now-bar-fill" style={{ width: str(min(pct, 100)) + '%' }} />
                      </div>
                    )}
                    <p className="profile-now-pct">{pct !== null ? str(pct) + '% completado' : 'En progreso'}</p>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        <div className="profile-col-right">
          <CollapsibleSection title="Estadísticas en AniList" defaultOpen={isDesktop}>
            <div className="stats-grid">
              <div className="stat-item clickable" onClick={() => { onTabClick('mylist'); onSubTabClick('COMPLETED'); }} style={{ cursor: 'pointer' }}>
                <Tv size={24} style={{ color: 'var(--color-anilist-blue)', marginBottom: '0.5rem' }} />
                <div className="stat-value">{animeList.filter(e => e.status === 'COMPLETED').length}</div>
                <div className="stat-label">Animes Vistos</div>
              </div>
              <div className="stat-item">
                <Tv size={24} style={{ color: 'var(--color-accent-green)', marginBottom: '0.5rem' }} />
                <div className="stat-value">{animeList.reduce((sum, e) => sum + (e.progress || 0), 0)}</div>
                <div className="stat-label">Episodios Vistos</div>
              </div>
              <div className="stat-item">
                <Clock size={24} style={{ color: 'var(--color-accent-purple)', marginBottom: '0.5rem' }} />
                <div className="stat-value">{Math.round(animeList.reduce((sum, e) => sum + (e.progress || 0) * (e.media?.duration || 24), 0) / 60)}</div>
                <div className="stat-label">Horas Vistas</div>
              </div>
              {user.statistics?.manga && (
                <>
                  <div className="stat-item">
                    <BookOpen size={24} style={{ color: 'var(--color-anilist-blue)', marginBottom: '0.5rem' }} />
                    <div className="stat-value">{user.statistics.manga.count || 0}</div>
                    <div className="stat-label">Manga en Lista</div>
                  </div>
                  <div className="stat-item">
                    <BookOpen size={24} style={{ color: 'var(--color-accent-green)', marginBottom: '0.5rem' }} />
                    <div className="stat-value">{user.statistics.manga.chaptersRead || 0}</div>
                    <div className="stat-label">Capítulos Leídos</div>
                  </div>
                </>
              )}
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Galería de Trofeos" defaultOpen={isDesktop}>
            <div className="trophy-grid">
              {TROPHY_CONFIG.map(trophy => {
                const isUnlocked = computedLevel >= trophy.level;
                return (
                  <div 
                    key={trophy.level} 
                    className={"trophy-card " + (isUnlocked ? 'trophy-unlocked' : 'trophy-locked')}
                  >
                    <div className="trophy-icon-wrapper">
                      {isUnlocked ? <Award size={24} /> : <Lock size={20} />}
                    </div>
                    <h4 className="trophy-title">Nivel {trophy.level}</h4>
                    <p className="trophy-req">{isUnlocked ? 'Desbloqueado' : 'Bloqueado'}</p>
                  </div>
                );
              })}
            </div>
          </CollapsibleSection>
        </div>
      </div>
    </div>
  );
};

'''

code = code[:app_start] + components + code[app_start:]

friend_start = code.find("case 'friend-profile': {")
friend_end = code.find("case 'mylist': {")

profile_start = code.find("case 'profile':")
profile_end = code.find("case 'settings':")

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

new_code = code[:profile_start] + new_profile + code[profile_end:]

# find friend again since string shifted
friend_start = new_code.find("case 'friend-profile': {")
friend_end = new_code.find("case 'mylist': {")

new_code = new_code[:friend_start] + new_friend + new_code[friend_end:]

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(new_code)
print("Refactor complete")