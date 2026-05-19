import React, { useState, useEffect } from 'react';
import { LogIn, LogOut, User, Tv, BookOpen, Clock, Settings, ShieldAlert } from 'lucide-react';
import Callback from './components/Callback';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('anilist_token') || '');
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCallback, setIsCallback] = useState(window.location.pathname === '/callback');
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);

  // Fetch all friends who have logged in
  const fetchFriends = async () => {
    setLoadingFriends(true);
    try {
      const response = await fetch('/api/friends');
      if (!response.ok) {
        throw new Error('No se pudo obtener la lista de amigos.');
      }
      const data = await response.json();
      setFriends(data);
    } catch (err) {
      console.error('Error fetching friends list:', err);
    } finally {
      setLoadingFriends(false);
    }
  };

  // Fetch friends list whenever token changes (e.g. login/logout)
  useEffect(() => {
    fetchFriends();
  }, [token]);

  // Fetch AniList user profile when token is set
  useEffect(() => {
    if (!token) {
      setUserData(null);
      return;
    }

    const fetchUserProfile = async () => {
      setLoading(true);
      setError('');
      
      const query = `
        query {
          Viewer {
            id
            name
            avatar {
              large
            }
            siteUrl
            about
            statistics {
              anime {
                count
                minutesWatched
                episodesWatched
              }
              manga {
                count
                chaptersRead
              }
            }
          }
        }
      `;

      try {
        const response = await fetch('https://graphql.anilist.co', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({ query }),
        });

        const result = await response.json();

        if (result.errors) {
          throw new Error(result.errors[0].message || 'Error al obtener perfil de AniList.');
        }

        setUserData(result.data.Viewer);
      } catch (err) {
        console.error('Error fetching AniList profile:', err);
        setError('No se pudo cargar el perfil. Puede que el token haya expirado o sea inválido.');
        // If unauthorized, clear token
        if (err.message.includes('Unauthorized') || err.message.includes('token')) {
          handleLogout();
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [token]);

  // Handle initiating login
  const handleLoginClick = async () => {
    setLoading(true);
    setError('');
    try {
      // Get OAuth config from backend to construct redirect URL
      const response = await fetch('/api/auth/config');
      if (!response.ok) {
        throw new Error('No se pudo obtener la configuración de autenticación del backend.');
      }
      
      const config = await response.json();
      
      if (!config.client_id || config.client_id === 'your_client_id_here') {
        throw new Error('El backend no está configurado. Por favor, edita el archivo backend/.env con tus credenciales de AniList.');
      }

      // Redirect user to AniList OAuth
      const aniListAuthUrl = `https://anilist.co/api/v2/oauth/authorize?client_id=${config.client_id}&redirect_uri=${encodeURIComponent(config.redirect_uri)}&response_type=code`;
      
      window.location.href = aniListAuthUrl;
    } catch (err) {
      console.error(err);
      setError(err.message);
      setLoading(false);
    }
  };

  const handleTokenSuccess = (newToken) => {
    localStorage.setItem('anilist_token', newToken);
    setToken(newToken);
    setIsCallback(false);
    // Clear URL parameters
    window.history.replaceState({}, document.title, '/');
  };

  const handleTokenError = (errorMessage) => {
    setError(errorMessage);
    setIsCallback(false);
    window.history.replaceState({}, document.title, '/');
  };

  const handleLogout = () => {
    localStorage.removeItem('anilist_token');
    setToken('');
    setUserData(null);
  };

  // If callback route, render Callback component
  if (isCallback) {
    return (
      <div className="app-container">
        <header>
          <div className="logo-container">
            <span className="logo-text">AniList Friends Hub</span>
          </div>
        </header>
        <Callback 
          onTokenSuccess={handleTokenSuccess} 
          onTokenError={handleTokenError} 
        />
      </div>
    );
  }

  return (
    <div className="app-container">
      <header>
        <div className="logo-container">
          <svg width="32" height="32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" rx="20" fill="#0b1622" />
            <path d="M50 15L85 75H15L50 15Z" fill="url(#grad)" />
            <defs>
              <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#c084fc" />
                <stop offset="100%" stopColor="#3db4f2" />
              </linearGradient>
            </defs>
          </svg>
          <span className="logo-text">AniList Friends Hub</span>
        </div>
        
        {token && userData && (
          <button onClick={handleLogout} className="btn-secondary">
            <LogOut size={16} />
            Cerrar Sesión
          </button>
        )}
      </header>

      <main style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {error && (
          <div className="alert alert-error">
            <ShieldAlert size={20} style={{ flexShrink: 0 }} />
            <div>
              <strong>¡Atención! </strong>
              {error}
            </div>
          </div>
        )}

        {loading && !userData ? (
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <div className="loader"></div>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: '1rem' }}>Cargando datos...</p>
          </div>
        ) : !token ? (
          /* LANDING PAGE (NOT LOGGED IN) */
          <div className="card" style={{ maxWidth: '650px', margin: '0 auto', textAlign: 'center' }}>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', fontFamily: 'var(--font-display)', lineHeight: '1.2' }}>
              Descubre y comparte tu anime con amigos
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.1rem', marginBottom: '2.5rem', lineHeight: '1.6' }}>
              Inicia sesión con tu cuenta de AniList para sincronizar tu perfil, ver tus estadísticas de anime/manga y compartir tu progreso en tiempo real.
            </p>
            
            <button 
              onClick={handleLoginClick} 
              disabled={loading}
              className="btn-primary"
              style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}
            >
              <LogIn size={20} />
              {loading ? 'Redirigiendo...' : 'Iniciar Sesión con AniList'}
            </button>
          </div>
        ) : (
          /* DASHBOARD (LOGGED IN) */
          userData && (
            <div className="dashboard-layout">
              {/* LEFT COLUMN: USER PROFILE */}
              <div className="card profile-card">
                <div className="profile-header">
                  <img 
                    src={userData.avatar?.large || 'https://anilist.co/img/icons/icon.svg'} 
                    alt={userData.name} 
                    className="avatar" 
                  />
                  <div className="profile-meta">
                    <h2>Bienvenido, {userData.name}</h2>
                    <p>ID de AniList: #{userData.id}</p>
                    <a 
                      href={userData.siteUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ color: 'var(--color-anilist-blue)', textDecoration: 'none', fontSize: '0.9rem', marginTop: '0.5rem', display: 'inline-block' }}
                    >
                      Ver perfil en AniList.co →
                    </a>
                  </div>
                </div>

                {userData.about && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', color: 'var(--color-text-primary)' }}>Sobre mí</h3>
                    <div 
                      style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem' }} 
                      dangerouslySetInnerHTML={{ __html: userData.about }}
                    />
                  </div>
                )}

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', color: 'var(--color-text-primary)' }}>Tus Estadísticas en AniList</h3>
                  
                  <div className="stats-grid">
                    <div className="stat-item">
                      <Tv size={24} style={{ color: 'var(--color-anilist-blue)', marginBottom: '0.5rem' }} />
                      <div className="stat-value">{userData.statistics?.anime?.count || 0}</div>
                      <div className="stat-label">Anime Visto</div>
                    </div>

                    <div className="stat-item">
                      <Clock size={24} style={{ color: 'var(--color-accent-purple)', marginBottom: '0.5rem' }} />
                      <div className="stat-value">
                        {Math.round((userData.statistics?.anime?.minutesWatched || 0) / 60)}
                      </div>
                      <div className="stat-label">Horas Vistas</div>
                    </div>

                    <div className="stat-item">
                      <BookOpen size={24} style={{ color: 'var(--color-accent-green)', marginBottom: '0.5rem' }} />
                      <div className="stat-value">{userData.statistics?.manga?.count || 0}</div>
                      <div className="stat-label">Manga Leído</div>
                    </div>
                  </div>
                </div>

                <details className="token-inspector">
                  <summary>Inspeccionar token de autenticación (Debug)</summary>
                  <code>{token}</code>
                </details>
              </div>

              {/* RIGHT COLUMN: FRIENDS CARD ("EL GRUPO") */}
              <div className="friends-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '1rem' }}>
                  <h2 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)' }}>El Grupo</h2>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-anilist-blue)', backgroundColor: 'rgba(61, 180, 242, 0.1)', padding: '0.25rem 0.6rem', borderRadius: '20px', fontWeight: '600' }}>
                    {friends.length} {friends.length === 1 ? 'miembro' : 'miembros'}
                  </span>
                </div>

                {loadingFriends ? (
                  <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                    <div className="loader" style={{ width: '30px', height: '30px', margin: '0 auto 1rem auto' }}></div>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>Cargando amigos...</p>
                  </div>
                ) : friends.length === 0 ? (
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', marginTop: '2rem', textAlign: 'center', lineHeight: '1.6' }}>
                    Aún no hay amigos registrados en el grupo.<br />
                    ¡Comparte el enlace de la web con tus amigos para que inicien sesión!
                  </p>
                ) : (
                  <div className="friends-list">
                    {friends.map((friend) => (
                      <a 
                        key={friend.id} 
                        href={friend.siteUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="friend-item"
                        title="Ver perfil en AniList"
                      >
                        <img 
                          src={friend.avatar || 'https://anilist.co/img/icons/icon.svg'} 
                          alt={friend.name} 
                          className="friend-avatar" 
                        />
                        <div className="friend-info">
                          <span className="friend-name">{friend.name}</span>
                          <span className="friend-status">
                            Activo: {new Date(friend.updatedAt).toLocaleDateString('es-ES', { 
                              day: 'numeric', 
                              month: 'short', 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        )}
      </main>
    </div>
  );
}
