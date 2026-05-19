import React, { useState, useEffect } from 'react';
import { LogIn, LogOut, User, Users, Tv, BookOpen, Clock, Settings, ShieldAlert, Search, X, Star, Plus } from 'lucide-react';
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

  const [refetchTrigger, setRefetchTrigger] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedAnime, setSelectedAnime] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [formStatus, setFormStatus] = useState('CURRENT');
  const [formProgress, setFormProgress] = useState(0);
  const [formScore, setFormScore] = useState(10);
  const [savingAnime, setSavingAnime] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [filterFormat, setFilterFormat] = useState('Todos');
  const [filterGenre, setFilterGenre] = useState('Todos');
  const [completedAnime, setCompletedAnime] = useState([]);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage('');
    }, 3000);
  };

  const fetchCompletedAnime = async (userId) => {
    if (!token) return;
    const query = `
      query ($userId: Int) {
        Page(page: 1, perPage: 100) {
          mediaList(userId: $userId, type: ANIME, status: COMPLETED) {
            id
            progress
            score(format: POINT_10)
            media {
              id
              title {
                userPreferred
              }
              coverImage {
                large
              }
              format
              episodes
              status
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
        body: JSON.stringify({
          query,
          variables: { userId }
        }),
      });

      const result = await response.json();
      if (!result.errors && result.data?.Page?.mediaList) {
        setCompletedAnime(result.data.Page.mediaList);
      }
    } catch (err) {
      console.error('Error fetching completed anime:', err);
    }
  };

  const refreshUserData = async () => {
    if (!token) return;
    setLoading(true);
    
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
        throw new Error(result.errors[0].message || 'Error al actualizar perfil.');
      }

      const viewer = result.data.Viewer;
      setUserData(viewer);
      await fetchCompletedAnime(viewer.id);
    } catch (err) {
      console.error('Error refreshing user data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch AniList user profile when token is set
  useEffect(() => {
    if (!token) {
      setUserData(null);
      setCompletedAnime([]);
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

        const viewer = result.data.Viewer;
        setUserData(viewer);
        await fetchCompletedAnime(viewer.id);
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
  }, [token, refetchTrigger]);

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
    setSearchResults([]);
    setSearchQuery('');
  };

  // Fetch anime list (handles search query, format filter, genre filter, and trending fallback)
  const fetchAnimeList = async (searchVal = '', selectedFormat = 'Todos', selectedGenre = 'Todos') => {
    setSearching(true);
    setError('');

    const variables = {};
    const filterParts = [];

    // Map format
    let formatVal = undefined;
    if (selectedFormat && selectedFormat !== 'Todos') {
      const formatMap = {
        'Serie': 'TV',
        'Película': 'MOVIE',
        'OVA': 'OVA',
        'Especial': 'SPECIAL'
      };
      formatVal = formatMap[selectedFormat] || selectedFormat;
    }

    // Map genre
    let genreVal = undefined;
    if (selectedGenre && selectedGenre !== 'Todos') {
      genreVal = selectedGenre;
    }

    if (searchVal.trim()) {
      variables.search = searchVal.trim();
      filterParts.push('search: $search');
    } else {
      variables.sort = ['POPULARITY_DESC'];
      filterParts.push('sort: $sort');
    }

    if (formatVal) {
      variables.format = formatVal;
      filterParts.push('format: $format');
    }

    if (genreVal) {
      variables.genre = [genreVal];
      filterParts.push('genre_in: $genre');
    }

    const filterString = filterParts.length ? `(${filterParts.join(', ')}, type: ANIME)` : '(type: ANIME)';

    const queryArgs = [
      searchVal.trim() ? '$search: String' : '',
      formatVal ? '$format: MediaFormat' : '',
      genreVal ? '$genre: [String]' : '',
      !searchVal.trim() ? '$sort: [MediaSort]' : ''
    ].filter(Boolean).join(', ');

    const query = queryArgs 
      ? `query (${queryArgs}) { Page(page: 1, perPage: 12) { media ${filterString} { id title { userPreferred } coverImage { large } episodes format status } } }`
      : `query { Page(page: 1, perPage: 12) { media (type: ANIME) { id title { userPreferred } coverImage { large } episodes format status } } }`;

    try {
      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables
        })
      });

      const result = await response.json();
      if (result.errors) {
        throw new Error(result.errors[0].message || 'Error al buscar anime.');
      }

      setSearchResults(result.data.Page.media || []);
    } catch (err) {
      console.error('Anime search error:', err);
      setError('No se pudo completar la búsqueda. Inténtalo de nuevo.');
    } finally {
      setSearching(false);
    }
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    fetchAnimeList(searchQuery, filterFormat, filterGenre);
  };

  const handleFormatChange = (e) => {
    const val = e.target.value;
    setFilterFormat(val);
    fetchAnimeList(searchQuery, val, filterGenre);
  };

  const handleGenreChange = (e) => {
    const val = e.target.value;
    setFilterGenre(val);
    fetchAnimeList(searchQuery, filterFormat, val);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setFilterFormat('Todos');
    setFilterGenre('Todos');
    fetchAnimeList('', 'Todos', 'Todos');
  };

  // Automatically fetch trending or filtered list on entering the search tab
  useEffect(() => {
    if (activeTab === 'search') {
      fetchAnimeList(searchQuery, filterFormat, filterGenre);
    }
  }, [activeTab]);

  const fetchAnimeDetails = async (animeId) => {
    setLoadingDetails(true);
    setError('');
    
    // Open modal immediately and reset edit mode
    setModalOpen(true);
    setShowEditForm(false);

    // Initial placeholder while fetching details (if we find the anime in existing search results)
    const existing = searchResults.find(a => a.id === animeId);
    if (existing) {
      setSelectedAnime(existing);
      setFormStatus('CURRENT');
      setFormProgress(0);
      setFormScore(10);
    }

    const query = `
      query ($id: Int) {
        Media(id: $id, type: ANIME) {
          id
          title {
            userPreferred
          }
          coverImage {
            large
          }
          bannerImage
          description
          averageScore
          format
          status
          episodes
          mediaListEntry {
            id
            status
            score(format: POINT_10)
            progress
          }
          relations {
            edges {
              relationType
              node {
                id
                title {
                  userPreferred
                }
                coverImage {
                  large
                }
                format
                episodes
                status
              }
            }
          }
        }
      }
    `;

    try {
      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          query,
          variables: { id: animeId }
        })
      });

      const result = await response.json();
      if (result.errors) {
        throw new Error(result.errors[0].message || 'Error al obtener detalles del anime.');
      }

      const media = result.data.Media;
      setSelectedAnime(media);

      // Prepopulate form if user has this in their list
      if (media.mediaListEntry) {
        setFormStatus(media.mediaListEntry.status || 'CURRENT');
        setFormProgress(media.mediaListEntry.progress || 0);
        setFormScore(media.mediaListEntry.score || 10);
        setShowEditForm(true); // Auto-open edit mode if they already have it
      } else {
        setFormStatus('CURRENT');
        setFormProgress(0);
        setFormScore(10);
      }
    } catch (err) {
      console.error('Error fetching anime details:', err);
      setError('No se pudieron cargar los detalles del anime.');
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeModal = () => {
    setSelectedAnime(null);
    setModalOpen(false);
    setShowEditForm(false);
  };

  // Save anime status & score to AniList
  const handleSaveAnime = async (e) => {
    e.preventDefault();
    if (!selectedAnime) return;

    setSavingAnime(true);
    setError('');

    try {
      const response = await fetch('/api/anime/save', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mediaId: selectedAnime.id,
          status: formStatus,
          progress: formProgress,
          score: formScore
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al guardar el anime en AniList.');
      }

      showToast('¡Guardado con éxito en AniList!');
      
      // Refresh user statistics and list info immediately
      await refreshUserData();
      
      // Refresh current detailed view of the anime (which updates status/progress in modal)
      await fetchAnimeDetails(selectedAnime.id);
    } catch (err) {
      console.error('Error saving anime list entry:', err);
      setError(err.message || 'Error al guardar los datos del anime.');
    } finally {
      setSavingAnime(false);
    }
  };

  // Render active tab content
  const renderContent = () => {
    switch (activeTab) {
      case 'completed':
        return (
          <div className="card completed-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', marginBottom: '0.25rem' }}>Animes Vistos</h2>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                  Lista de series y películas que has completado.
                </p>
              </div>
              <button 
                className="btn-secondary" 
                onClick={() => setActiveTab('profile')}
                style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
              >
                Volver al Perfil
              </button>
            </div>

            {completedAnime.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-text-secondary)' }}>
                <Tv size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                <p>No tienes ningún anime marcado como "Visto" aún.</p>
                <button 
                  className="btn-primary" 
                  onClick={() => setActiveTab('search')}
                  style={{ marginTop: '1rem' }}
                >
                  Buscar Animes para Añadir
                </button>
              </div>
            ) : (
              <div className="anime-grid">
                {completedAnime.map((item) => {
                  const anime = item.media;
                  if (!anime) return null;
                  return (
                    <div key={item.id} className="anime-card" onClick={() => fetchAnimeDetails(anime.id)}>
                      {anime.status && (anime.status === 'RELEASING' || anime.status === 'NOT_YET_RELEASED') && (
                        <div className={`status-indicator ${anime.status.toLowerCase()}`} title={anime.status === 'RELEASING' ? 'En Emisión' : 'Próximamente'} />
                      )}
                      <img 
                        src={anime.coverImage?.large || 'https://anilist.co/img/icons/icon.svg'} 
                        alt={anime.title?.userPreferred} 
                        className="anime-cover"
                      />
                      <div className="anime-info">
                        <span className="anime-title" title={anime.title?.userPreferred}>
                          {anime.title?.userPreferred}
                        </span>
                        <div className="anime-meta">
                          <span style={{ color: 'var(--color-accent-green)', fontWeight: '600' }}>
                            Nota: {item.score ? `${item.score}/10` : 'Sin nota'}
                          </span>
                          <span>{anime.episodes ? `${item.progress}/${anime.episodes} eps` : `${item.progress} eps`}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      case 'profile':
        return (
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
                <div className="stat-item clickable" onClick={() => setActiveTab('completed')} style={{ cursor: 'pointer' }}>
                  <Tv size={24} style={{ color: 'var(--color-anilist-blue)', marginBottom: '0.5rem' }} />
                  <div className="stat-value">{completedAnime.length}</div>
                  <div className="stat-label">Animes Vistos</div>
                </div>

                <div className="stat-item">
                  <Tv size={24} style={{ color: 'var(--color-accent-green)', marginBottom: '0.5rem' }} />
                  <div className="stat-value">{userData.statistics?.anime?.episodesWatched || 0}</div>
                  <div className="stat-label">Episodios Vistos</div>
                </div>

                <div className="stat-item">
                  <Clock size={24} style={{ color: 'var(--color-accent-purple)', marginBottom: '0.5rem' }} />
                  <div className="stat-value">
                    {Math.round((userData.statistics?.anime?.minutesWatched || 0) / 60)}
                  </div>
                  <div className="stat-label">Horas Vistas</div>
                </div>

                <div className="stat-item">
                  <BookOpen size={24} style={{ color: 'var(--color-anilist-blue)', marginBottom: '0.5rem' }} />
                  <div className="stat-value">{userData.statistics?.manga?.count || 0}</div>
                  <div className="stat-label">Manga en Lista</div>
                </div>

                <div className="stat-item">
                  <BookOpen size={24} style={{ color: 'var(--color-accent-green)', marginBottom: '0.5rem' }} />
                  <div className="stat-value">{userData.statistics?.manga?.chaptersRead || 0}</div>
                  <div className="stat-label">Capítulos Leídos</div>
                </div>
              </div>
            </div>

            <details className="token-inspector">
              <summary>Inspeccionar token de autenticación (Debug)</summary>
              <code>{token}</code>
            </details>
          </div>
        );
      case 'search':
        return (
          <div className="search-card">
            <h2 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>Buscador de Anime</h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              Busca series o películas de anime para agregarlas a tu lista o actualizar tu progreso.
            </p>
            
            <form onSubmit={handleSearchSubmit} className="search-form">
              <div className="search-bar-row">
                <input 
                  type="text" 
                  placeholder="Ej: Frieren, Shingeki no Kyojin, One Piece..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                <button type="submit" className="btn-primary" disabled={searching}>
                  <Search size={18} />
                  {searching ? 'Buscando...' : 'Buscar'}
                </button>
              </div>

              <div className="search-filters-row">
                <div className="filter-group">
                  <label htmlFor="filter-format" className="filter-label">Formato</label>
                  <select 
                    id="filter-format"
                    value={filterFormat} 
                    onChange={handleFormatChange}
                    className="filter-select"
                  >
                    <option value="Todos">Todos los formatos</option>
                    <option value="Serie">Serie (TV)</option>
                    <option value="Película">Película (Movie)</option>
                    <option value="OVA">OVA</option>
                    <option value="Especial">Especial</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label htmlFor="filter-genre" className="filter-label">Género</label>
                  <select 
                    id="filter-genre"
                    value={filterGenre} 
                    onChange={handleGenreChange}
                    className="filter-select"
                  >
                    <option value="Todos">Todos los géneros</option>
                    <option value="Action">Acción</option>
                    <option value="Adventure">Aventura</option>
                    <option value="Comedy">Comedia</option>
                    <option value="Drama">Drama</option>
                    <option value="Fantasy">Fantasía</option>
                    <option value="Horror">Terror</option>
                    <option value="Mystery">Misterio</option>
                    <option value="Psychological">Psicológico</option>
                    <option value="Romance">Romance</option>
                    <option value="Sci-Fi">Ciencia Ficción</option>
                    <option value="Slice of Life">Recuentos de la vida</option>
                    <option value="Sports">Deportes</option>
                    <option value="Supernatural">Sobrenatural</option>
                    <option value="Thriller">Suspense</option>
                  </select>
                </div>
              </div>
            </form>

            <h3 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-display)', marginTop: '2.5rem', marginBottom: '1.25rem', color: 'var(--color-text-primary)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              {searchQuery.trim() ? 'Resultados de Búsqueda' : 'Animes del Momento (Tendencias)'}
            </h3>

            {/* SEARCH RESULTS */}
            {searchResults.length > 0 ? (
              <div className="anime-grid">
                {searchResults.map((anime) => (
                  <div key={anime.id} className="anime-card" onClick={() => fetchAnimeDetails(anime.id)}>
                    {anime.status && (anime.status === 'RELEASING' || anime.status === 'NOT_YET_RELEASED') && (
                      <div className={`status-indicator ${anime.status.toLowerCase()}`} title={anime.status === 'RELEASING' ? 'En Emisión' : 'Próximamente'} />
                    )}
                    <img 
                      src={anime.coverImage?.large || 'https://anilist.co/img/icons/icon.svg'} 
                      alt={anime.title?.userPreferred} 
                      className="anime-cover"
                    />
                    <div className="anime-info">
                      <span className="anime-title" title={anime.title?.userPreferred}>
                        {anime.title?.userPreferred}
                      </span>
                      <div className="anime-meta">
                        <span>{anime.format || 'ANIME'}</span>
                        <span>{anime.episodes ? `${anime.episodes} eps` : '?' }</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : !searching ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--color-text-secondary)' }}>
                No se encontraron resultados para los filtros seleccionados.
              </div>
            ) : null}

            {(searchResults.length > 0 || searchQuery || filterFormat || filterGenre) && (
              <button 
                onClick={handleClearSearch} 
                className="btn-secondary" 
                style={{ marginTop: '2rem', width: '100%' }}
              >
                Limpiar Filtros y Búsqueda
              </button>
            )}
          </div>
        );
      case 'group':
        return (
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
        );
      default:
        return null;
    }
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

  // If not logged in, render Landing page
  if (!token) {
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

          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem' }}>
              <div className="loader"></div>
              <p style={{ color: 'var(--color-text-secondary)', marginTop: '1rem' }}>Cargando...</p>
            </div>
          ) : (
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
          )}
        </main>
      </div>
    );
  }

  // If loading userData
  if (token && !userData) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="loader"></div>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '1rem' }}>Cargando tu perfil de AniList...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* SIDEBAR FOR DESKTOP */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <svg width="28" height="28" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" rx="20" fill="#0b1622" />
            <path d="M50 15L85 75H15L50 15Z" fill="url(#grad-side)" />
            <defs>
              <linearGradient id="grad-side" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#c084fc" />
                <stop offset="100%" stopColor="#3db4f2" />
              </linearGradient>
            </defs>
          </svg>
          <span className="logo-text">AniList Hub</span>
        </div>

        <nav className="sidebar-nav">
          <button 
            className={`sidebar-nav-item ${activeTab === 'profile' || activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={18} />
            <span>Mi Perfil</span>
          </button>
          
          <button 
            className={`sidebar-nav-item ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            <Search size={18} />
            <span>Buscar Anime</span>
          </button>
          
          <button 
            className={`sidebar-nav-item ${activeTab === 'group' ? 'active' : ''}`}
            onClick={() => setActiveTab('group')}
          >
            <Users size={18} />
            <span>El Grupo</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <img 
              src={userData.avatar?.large || 'https://anilist.co/img/icons/icon.svg'} 
              alt={userData.name} 
              className="sidebar-avatar"
            />
            <div className="sidebar-user-meta">
              <span className="sidebar-username">{userData.name}</span>
            </div>
          </div>
          <button onClick={handleLogout} className="btn-secondary" style={{ width: '100%', marginTop: '1rem' }}>
            <LogOut size={16} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      <div className="app-main-content">
        {/* MOBILE TOP BAR */}
        <header className="mobile-header">
          <div className="logo-container">
            <svg width="24" height="24" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="100" height="100" rx="20" fill="#0b1622" />
              <path d="M50 15L85 75H15L50 15Z" fill="url(#grad-mob)" />
              <defs>
                <linearGradient id="grad-mob" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#c084fc" />
                  <stop offset="100%" stopColor="#3db4f2" />
                </linearGradient>
              </defs>
            </svg>
            <span className="logo-text">AniList Hub</span>
          </div>
          <button onClick={handleLogout} className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
            <LogOut size={14} />
            Salir
          </button>
        </header>

        <main className="dashboard-content-area">
          {error && (
            <div className="alert alert-error">
              <ShieldAlert size={20} style={{ flexShrink: 0 }} />
              <div>
                <strong>¡Atención! </strong>
                {error}
              </div>
            </div>
          )}

          {renderContent()}
        </main>

        {/* MOBILE BOTTOM NAVIGATION BAR */}
        <nav className="bottom-nav">
          <button 
            className={`bottom-nav-item ${activeTab === 'profile' || activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={20} />
            <span>Perfil</span>
          </button>
          
          <button 
            className={`bottom-nav-item ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            <Search size={20} />
            <span>Buscar</span>
          </button>
          
          <button 
            className={`bottom-nav-item ${activeTab === 'group' ? 'active' : ''}`}
            onClick={() => setActiveTab('group')}
          >
            <Users size={20} />
            <span>Grupo</span>
          </button>
        </nav>
      </div>

      {/* ANIME DETAILS & EDITOR MODAL */}
      {modalOpen && selectedAnime && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content detail-modal" onClick={(e) => e.stopPropagation()}>
            {/* Banner Image */}
            {selectedAnime.bannerImage ? (
              <div className="detail-banner" style={{ backgroundImage: `url(${selectedAnime.bannerImage})` }}>
                <div className="detail-banner-overlay"></div>
              </div>
            ) : (
              <div className="detail-banner-placeholder"></div>
            )}

            {/* Modal Header */}
            <div className="detail-header">
              <img 
                src={selectedAnime.coverImage?.large || 'https://anilist.co/img/icons/icon.svg'} 
                alt={selectedAnime.title?.userPreferred} 
                className="detail-cover"
              />
              <div className="detail-header-info">
                <h3>{selectedAnime.title?.userPreferred}</h3>
                <div className="detail-badges">
                  <span className="badge format-badge">{selectedAnime.format || 'ANIME'}</span>
                  {selectedAnime.status && (
                    <span className={`badge status-badge ${selectedAnime.status.toLowerCase()}`}>
                      {selectedAnime.status === 'FINISHED' ? 'Finalizado' :
                       selectedAnime.status === 'RELEASING' ? 'En Emisión' :
                       selectedAnime.status === 'NOT_YET_RELEASED' ? 'Próximamente' :
                       selectedAnime.status === 'CANCELLED' ? 'Cancelado' : 'En Pausa'}
                    </span>
                  )}
                  {selectedAnime.averageScore && (
                    <span className="badge score-badge">
                      <Star size={12} fill="currentColor" style={{ marginRight: '2px' }} />
                      {selectedAnime.averageScore}%
                    </span>
                  )}
                </div>
                <p className="detail-episodes">
                  {selectedAnime.episodes ? `${selectedAnime.episodes} episodios` : 'Episodios totales desconocidos'}
                </p>
              </div>
              <button onClick={closeModal} className="detail-close-btn">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="detail-body">
              {loadingDetails ? (
                <div className="detail-loading">
                  <div className="loader"></div>
                  <p>Cargando información detallada...</p>
                </div>
              ) : (
                <>
                  {/* Synopsis */}
                  {selectedAnime.description && (
                    <div className="detail-section">
                      <h4>Sinopsis</h4>
                      <div 
                        className="detail-description"
                        dangerouslySetInnerHTML={{ __html: selectedAnime.description }}
                      />
                    </div>
                  )}

                  {/* Relations */}
                  {selectedAnime.relations?.edges?.filter(edge => 
                    ['PREQUEL', 'SEQUEL', 'ALTERNATIVE'].includes(edge.relationType)
                  ).length > 0 && (
                    <div className="detail-section">
                      <h4>Relaciones y Temporadas</h4>
                      <div className="relations-grid">
                        {selectedAnime.relations.edges
                          .filter(edge => ['PREQUEL', 'SEQUEL', 'ALTERNATIVE'].includes(edge.relationType))
                          .map(edge => (
                            <div 
                              key={edge.node.id} 
                              className="relation-item" 
                              onClick={() => fetchAnimeDetails(edge.node.id)}
                            >
                              <img 
                                src={edge.node.coverImage?.large || 'https://anilist.co/img/icons/icon.svg'} 
                                alt={edge.node.title?.userPreferred} 
                              />
                              <div className="relation-meta">
                                <span className="relation-type">
                                  {edge.relationType === 'PREQUEL' ? 'Precuela' : 
                                   edge.relationType === 'SEQUEL' ? 'Secuela' : 'Alternativo'}
                                </span>
                                <span className="relation-title" title={edge.node.title?.userPreferred}>
                                  {edge.node.title?.userPreferred}
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* List progress editor */}
                  <div className="detail-section progress-section">
                    <div className="progress-section-header" onClick={() => setShowEditForm(!showEditForm)}>
                      <h4>{selectedAnime.mediaListEntry ? '✓ En tu lista (Editar)' : '+ Añadir a tu lista'}</h4>
                      {!token && <span className="login-alert-text">Inicia sesión para guardar</span>}
                    </div>

                    {token && (
                      <form onSubmit={handleSaveAnime} className="progress-form">
                        <div className="progress-form-grid">
                          <div className="form-group">
                            <label className="form-label">Estado</label>
                            <select 
                              value={formStatus} 
                              onChange={(e) => setFormStatus(e.target.value)}
                              className="form-select"
                            >
                              <option value="CURRENT">Viendo</option>
                              <option value="COMPLETED">Visto</option>
                              <option value="PLANNING">Planeo Ver</option>
                              <option value="PAUSED">En Pausa</option>
                              <option value="DROPPED">Abandonado</option>
                            </select>
                          </div>

                          <div className="form-group">
                            <label className="form-label">Episodios Vistos</label>
                            <div className="episode-counter-wrapper">
                              <input 
                                type="number" 
                                min="0"
                                max={selectedAnime.episodes || undefined}
                                value={formProgress}
                                onChange={(e) => setFormProgress(Math.min(selectedAnime.episodes || Infinity, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                                className="form-number"
                                style={{ width: '80px', textAlign: 'center' }}
                              />
                              {selectedAnime.episodes && (
                                <span className="episode-max">/ {selectedAnime.episodes}</span>
                              )}
                              <button 
                                type="button" 
                                onClick={() => setFormProgress(prev => Math.min(selectedAnime.episodes || Infinity, prev + 1))}
                                className="btn-episode-plus"
                                title="Añadir un episodio"
                                style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                              >
                                <Plus size={14} />
                                1 Ep
                              </button>
                            </div>
                          </div>

                          <div className="form-group score-group">
                            <label className="form-label">Puntuación</label>
                            <div className="score-slider-group">
                              <input 
                                type="range" 
                                min="1" 
                                max="10" 
                                step="1"
                                value={formScore}
                                onChange={(e) => setFormScore(parseInt(e.target.value, 10))}
                                className="score-slider"
                              />
                              <span className="score-display">
                                <Star size={16} fill="var(--color-anilist-blue)" color="var(--color-anilist-blue)" style={{ marginRight: '0.25rem', display: 'inline', verticalAlign: 'middle' }} />
                                {formScore}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="progress-actions">
                          <button type="submit" className="btn-primary" disabled={savingAnime}>
                            {savingAnime ? 'Guardando...' : 'Guardar Progreso'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="toast-notification">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
