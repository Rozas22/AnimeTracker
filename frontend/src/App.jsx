import React, { useState, useEffect } from 'react';
import { LogIn, LogOut, User, Users, Tv, BookOpen, Clock, Settings, ShieldAlert, Search, X, Star, Plus, List, Grid, Download } from 'lucide-react';
import Callback from './components/Callback';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export default function App() {
  const getInitialRouteInfo = () => {
    const path = window.location.pathname;
    if (path.startsWith('/profile/')) {
      const username = path.substring('/profile/'.length);
      return { tab: 'friend-profile', username };
    }
    return { tab: 'profile', username: null };
  };

  const initialRoute = getInitialRouteInfo();

  const [token, setToken] = useState(localStorage.getItem('anilist_token') || '');
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCallback, setIsCallback] = useState(window.location.pathname === '/callback');
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  // Router and Dynamic friend profile state
  const [activeTab, setActiveTab] = useState(initialRoute.tab);
  const [viewedFriendUsername, setViewedFriendUsername] = useState(initialRoute.username);
  
  // Friend search and profile loading states
  const [friendSearchQuery, setFriendSearchQuery] = useState('');
  const [addingFriend, setAddingFriend] = useState(false);
  const [friendAddError, setFriendAddError] = useState('');
  
  const [friendData, setFriendData] = useState(null);
  const [friendAnimeList, setFriendAnimeList] = useState([]);
  const [friendLoading, setFriendLoading] = useState(false);
  const [friendMylistSubTab, setFriendMylistSubTab] = useState('CURRENT');

  // PWA Update states
  const [swRegistration, setSwRegistration] = useState(null);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);

  // Fetch all friends who have logged in
  const fetchFriends = async () => {
    setLoadingFriends(true);
    const targetUrl = `${API_BASE_URL}/api/friends`;
    try {
      const response = await fetch(targetUrl).catch(error => {
        console.log('Error de conexión:', error, 'al intentar conectar con:', targetUrl);
        throw error;
      });
      if (response.headers.get('content-type')?.includes('text/html')) {
        throw new Error(`El servidor devolvió HTML en lugar de JSON al conectar con ${targetUrl}. Revisa que la variable de entorno VITE_API_URL sea correcta.`);
      }
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

  const handleAddFriend = async (e) => {
    e.preventDefault();
    if (!friendSearchQuery.trim()) return;

    setAddingFriend(true);
    setFriendAddError('');
    const targetUrl = `${API_BASE_URL}/api/friends/add`;

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: friendSearchQuery.trim() }),
      }).catch(error => {
        console.log('Error de conexión:', error, 'al intentar conectar con:', targetUrl);
        throw error;
      });

      if (response.headers.get('content-type')?.includes('text/html')) {
        throw new Error(`El servidor devolvió HTML en lugar de JSON al conectar con ${targetUrl}. Revisa que la variable de entorno VITE_API_URL sea correcta.`);
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo agregar al amigo.');
      }

      showToast(`¡${data.name} ha sido agregado con éxito a El Grupo!`);
      setFriendSearchQuery('');
      await fetchFriends();
    } catch (err) {
      console.error('Error adding friend:', err);
      setFriendAddError(err.message || 'Ocurrió un error al intentar agregar al amigo.');
    } finally {
      setAddingFriend(false);
    }
  };

  // Fetch friends list whenever token changes (e.g. login/logout)
  useEffect(() => {
    fetchFriends();
  }, [token]);

  // Listen for PWA installation prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth <= 768;
      if (isMobileDevice) {
        setShowInstallBtn(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      console.log('PWA instalada correctamente.');
      setDeferredPrompt(null);
      setShowInstallBtn(false);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Detect if a new Service Worker is waiting to update
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // 1. Get current registration
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (!reg) return;
        setSwRegistration(reg);

        // Check if there is already an installed service worker waiting
        if (reg.waiting) {
          setShowUpdateBanner(true);
        }

        // Listen for new service worker installation
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // There is a new worker installed and waiting to control the page
                setShowUpdateBanner(true);
              }
            });
          }
        });
      });

      // 2. Listen for controller changes to trigger reload
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }
  }, []);

  const handleUpdateApp = () => {
    if (swRegistration && swRegistration.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg && reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        } else {
          window.location.reload();
        }
      });
    }
    setShowUpdateBanner(false);
  };

  // Sync tab state with browser history (back/forward routing)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.startsWith('/profile/')) {
        const username = path.substring('/profile/'.length);
        setActiveTab('friend-profile');
        setViewedFriendUsername(username);
      } else if (path === '/callback') {
        setIsCallback(true);
      } else {
        setIsCallback(false);
        setActiveTab('profile');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Fetch friend's profile when routing is triggered
  useEffect(() => {
    if (activeTab === 'friend-profile' && viewedFriendUsername) {
      fetchFriendProfile(viewedFriendUsername);
    }
  }, [activeTab, viewedFriendUsername]);

  const fetchFriendProfile = async (username) => {
    if (!username) return;
    setFriendLoading(true);
    setFriendError('');
    setFriendData(null);
    setFriendAnimeList([]);

    const query = `
      query ($name: String) {
        User (name: $name) {
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
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          query,
          variables: { name: username }
        })
      });

      const result = await response.json();
      if (result.errors) {
        throw new Error(result.errors[0].message || 'No se pudo encontrar el usuario.');
      }

      const user = result.data.User;
      setFriendData(user);

      // Now fetch their anime list
      await fetchFriendAnimeList(user.id);
    } catch (err) {
      console.error('Error fetching friend profile:', err);
      setFriendError(err.message || 'Error al cargar el perfil del amigo.');
    } finally {
      setFriendLoading(false);
    }
  };

  const fetchFriendAnimeList = async (userId) => {
    const query = `
      query ($userId: Int) {
        Page(page: 1, perPage: 100) {
          mediaList(userId: $userId, type: ANIME) {
            id
            status
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
              startDate {
                year
                month
                day
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
          variables: { userId }
        })
      });

      const result = await response.json();
      if (result.errors) {
        throw new Error(result.errors[0].message || 'Error al obtener lista del amigo.');
      }

      setFriendAnimeList(result.data.Page.mediaList || []);
    } catch (err) {
      console.error('Error fetching friend list:', err);
    }
  };

  const handleNavigateToFriend = (friendName) => {
    window.history.pushState(null, '', `/profile/${friendName}`);
    setViewedFriendUsername(friendName);
    setActiveTab('friend-profile');
  };

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
  const [filterFormat, setFilterFormat] = useState('Todos');
  const [filterGenre, setFilterGenre] = useState('Todos');
  const [completedAnime, setCompletedAnime] = useState([]);
  const [toastMessage, setToastMessage] = useState('');
  const [expandedGroups, setExpandedGroups] = useState({});
  const [mylistSubTab, setMylistSubTab] = useState('CURRENT');
  const [searchPage, setSearchPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [viewMode, setViewMode] = useState(localStorage.getItem('view_mode') || 'grid'); // 'grid' or 'list'

  const toggleViewMode = () => {
    const nextMode = viewMode === 'grid' ? 'list' : 'grid';
    setViewMode(nextMode);
    localStorage.setItem('view_mode', nextMode);
  };

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage('');
    }, 3000);
  };

  const fetchUserAnimeList = async (userId) => {
    if (!token) return;
    const query = `
      query ($userId: Int) {
        Page(page: 1, perPage: 100) {
          mediaList(userId: $userId, type: ANIME) {
            id
            status
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
              startDate {
                year
                month
                day
              }
              relations {
                edges {
                  relationType
                  node {
                    id
                  }
                }
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
      console.error('Error fetching user anime list:', err);
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
      await fetchUserAnimeList(viewer.id);
    } catch (err) {
      console.error('Error refreshing user data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabClick = (tabName) => {
    setActiveTab(tabName);
    window.history.pushState(null, '', '/');
    refreshUserData();
  };

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`Elección de instalación: ${outcome}`);
    setDeferredPrompt(null);
    setShowInstallBtn(false);
  };

  const handleQuickIncrement = async (entry, e) => {
    e.stopPropagation();
    if (!entry || !entry.media) return;
    
    const media = entry.media;
    const currentProgress = entry.progress || 0;
    const totalEpisodes = media.episodes || 9999;
    
    if (currentProgress >= totalEpisodes) {
      showToast('¡Ya has completado este anime!');
      return;
    }
    
    const nextProgress = currentProgress + 1;
    // If progress reaches total episodes, automatically set status to COMPLETED
    const nextStatus = nextProgress === totalEpisodes ? 'COMPLETED' : entry.status;
    
    const targetUrl = `${API_BASE_URL}/api/anime/save`;
    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mediaId: media.id,
          status: nextStatus,
          progress: nextProgress,
          score: entry.score || 10
        })
      }).catch(error => {
        console.log('Error de conexión:', error, 'al intentar conectar con:', targetUrl);
        throw error;
      });

      if (response.headers.get('content-type')?.includes('text/html')) {
        throw new Error(`El servidor devolvió HTML en lugar de JSON al conectar con ${targetUrl}. Revisa que la variable de entorno VITE_API_URL sea correcta.`);
      }

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Error al actualizar el progreso.');
      }

      showToast(`Progreso de ${media.title?.userPreferred} actualizado a: ${nextProgress}/${media.episodes || '?'}`);
      await refreshUserData();
    } catch (err) {
      console.error('Error incrementing progress:', err);
      showToast('Error al actualizar el progreso');
    }
  };

  const groupCompletedAnimeByFranchise = (list) => {
    if (!list || list.length === 0) return [];

    // 1. Map mediaId to completed list entry
    const entryMap = {};
    list.forEach(entry => {
      if (entry.media) {
        entryMap[entry.media.id] = entry;
      }
    });

    // 2. Build adjacency list of completed items
    const adj = {};
    list.forEach(entry => {
      const media = entry.media;
      if (!media) return;
      adj[media.id] = new Set();
      
      const relations = media.relations?.edges || [];
      relations.forEach(edge => {
        const relId = edge.node?.id;
        // Only build edge if the related anime is also completed by the user
        if (relId && entryMap[relId]) {
          adj[media.id].add(relId);
          // Ensure it's undirected/mutual for connected component mapping
          if (!adj[relId]) {
            adj[relId] = new Set();
          }
          adj[relId].add(media.id);
        }
      });
    });

    // 3. Find connected components (franchises)
    const visited = new Set();
    const groups = [];

    list.forEach(entry => {
      const media = entry.media;
      if (!media || visited.has(media.id)) return;

      const component = [];
      const queue = [media.id];
      visited.add(media.id);

      while (queue.length > 0) {
        const currId = queue.shift();
        component.push(entryMap[currId]);

        const neighbors = adj[currId] || [];
        neighbors.forEach(neighborId => {
          if (!visited.has(neighborId)) {
            visited.add(neighborId);
            queue.push(neighborId);
          }
        });
      }

      // Sort items inside the component chronologically
      component.sort((a, b) => {
        const dateA = a.media.startDate;
        const dateB = b.media.startDate;
        
        const yearA = dateA?.year || 0;
        const yearB = dateB?.year || 0;
        if (yearA !== yearB) return yearA - yearB;

        const monthA = dateA?.month || 0;
        const monthB = dateB?.month || 0;
        if (monthA !== monthB) return monthA - monthB;

        const dayA = dateA?.day || 0;
        const dayB = dateB?.day || 0;
        return dayA - dayB;
      });

      // The last element in the sorted chronological list is the most recent one
      const mostRecentEntry = component[component.length - 1];

      groups.push({
        id: mostRecentEntry.id, // Group identifier (recent entry's list ID)
        mostRecent: mostRecentEntry,
        items: component // All items in the franchise, ordered chronologically
      });
    });

    // Sort the groups by recent entry's ID in descending order (latest completed first)
    groups.sort((a, b) => b.mostRecent.id - a.mostRecent.id);

    return groups;
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
        await fetchUserAnimeList(viewer.id);
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
    const targetUrl = `${API_BASE_URL}/api/auth/config`;
    try {
      // Get OAuth config from backend to construct redirect URL
      const response = await fetch(targetUrl).catch(error => {
        console.log('Error de conexión:', error, 'al intentar conectar con:', targetUrl);
        throw error;
      });

      if (response.headers.get('content-type')?.includes('text/html')) {
        throw new Error(`El servidor devolvió HTML en lugar de JSON al conectar con ${targetUrl}. Revisa que la variable de entorno VITE_API_URL sea correcta.`);
      }

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

  // Fetch anime list (handles search query, format filter, genre filter, trending fallback, and pagination)
  const fetchAnimeList = async (searchVal = '', selectedFormat = 'Todos', selectedGenre = 'Todos', pageNum = 1) => {
    if (pageNum === 1) {
      setSearching(true);
    } else {
      setLoadingMore(true);
    }
    setError('');

    const variables = { page: pageNum };
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
      '$page: Int',
      searchVal.trim() ? '$search: String' : '',
      formatVal ? '$format: MediaFormat' : '',
      genreVal ? '$genre: [String]' : '',
      !searchVal.trim() ? '$sort: [MediaSort]' : ''
    ].filter(Boolean).join(', ');

    const query = `query (${queryArgs}) {
      Page(page: $page, perPage: 12) {
        pageInfo {
          currentPage
          hasNextPage
        }
        media ${filterString} {
          id
          title {
            userPreferred
          }
          coverImage {
            large
          }
          episodes
          format
          status
        }
      }
    }`;

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

      const pageInfo = result.data.Page.pageInfo;
      const media = result.data.Page.media || [];
      
      setHasNextPage(pageInfo?.hasNextPage || false);
      setSearchPage(pageNum);

      if (pageNum === 1) {
        setSearchResults(media);
      } else {
        setSearchResults(prev => [...prev, ...media]);
      }
    } catch (err) {
      console.error('Anime search error:', err);
      setError('No se pudo completar la búsqueda. Inténtalo de nuevo.');
    } finally {
      setSearching(false);
      setLoadingMore(false);
    }
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setSearchPage(1);
    fetchAnimeList(searchQuery, filterFormat, filterGenre, 1);
  };

  const handleFormatChange = (e) => {
    const val = e.target.value;
    setFilterFormat(val);
    setSearchPage(1);
    fetchAnimeList(searchQuery, val, filterGenre, 1);
  };

  const handleGenreChange = (e) => {
    const val = e.target.value;
    setFilterGenre(val);
    setSearchPage(1);
    fetchAnimeList(searchQuery, filterFormat, val, 1);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setFilterFormat('Todos');
    setFilterGenre('Todos');
    setSearchPage(1);
    fetchAnimeList('', 'Todos', 'Todos', 1);
  };

  const loadNextSearchPage = async () => {
    if (!hasNextPage || searching || loadingMore) return;
    const nextPage = searchPage + 1;
    await fetchAnimeList(searchQuery, filterFormat, filterGenre, nextPage);
  };

  // Automatically fetch trending or filtered list on entering the search tab
  useEffect(() => {
    if (activeTab === 'search') {
      setSearchPage(1);
      fetchAnimeList(searchQuery, filterFormat, filterGenre, 1);
    }
  }, [activeTab]);

  // Setup Intersection Observer for infinite scrolling in search
  useEffect(() => {
    if (activeTab !== 'search') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && hasNextPage && !searching && !loadingMore) {
          loadNextSearchPage();
        }
      },
      {
        root: null,
        rootMargin: '200px', // Fetch next page 200px before reaching bottom
        threshold: 0.1,
      }
    );

    const anchor = document.getElementById('search-infinite-anchor');
    if (anchor) {
      observer.observe(anchor);
    }

    return () => {
      if (anchor) {
        observer.unobserve(anchor);
      }
    };
  }, [activeTab, hasNextPage, searching, loadingMore, searchPage, searchQuery, filterFormat, filterGenre]);

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
    const targetUrl = `${API_BASE_URL}/api/anime/save`;

    try {
      const response = await fetch(targetUrl, {
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
      }).catch(error => {
        console.log('Error de conexión:', error, 'al intentar conectar con:', targetUrl);
        throw error;
      });

      if (response.headers.get('content-type')?.includes('text/html')) {
        throw new Error(`El servidor devolvió HTML en lugar de JSON al conectar con ${targetUrl}. Revisa que la variable de entorno VITE_API_URL sea correcta.`);
      }

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
      case 'friend-profile': {
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

        const filteredList = friendAnimeList.filter(entry => entry.status === friendMylistSubTab);
        const groupedList = groupCompletedAnimeByFranchise(filteredList);

        return (
          <div className="card profile-card friend-profile-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Perfil de Miembro del Grupo</span>
              <button className="btn-secondary" onClick={() => handleTabClick('group')} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                Volver al Grupo
              </button>
            </div>

            <div className="profile-header">
              <img 
                src={friendData.avatar?.large || 'https://anilist.co/img/icons/icon.svg'} 
                alt={friendData.name} 
                className="avatar" 
              />
              <div className="profile-meta">
                <h2>{friendData.name}</h2>
                <p>ID de AniList: #{friendData.id}</p>
                <a 
                  href={friendData.siteUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: 'var(--color-anilist-blue)', textDecoration: 'none', fontSize: '0.9rem', marginTop: '0.5rem', display: 'inline-block' }}
                >
                  Ver perfil original en AniList.co →
                </a>
              </div>
            </div>

            {friendData.about && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', color: 'var(--color-text-primary)' }}>Sobre {friendData.name}</h3>
                <div 
                  style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem' }} 
                  dangerouslySetInnerHTML={{ __html: friendData.about }}
                />
              </div>
            )}

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem', marginBottom: '2.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', color: 'var(--color-text-primary)' }}>Estadísticas en AniList</h3>
              
              <div className="stats-grid">
                <div className="stat-item">
                  <Tv size={24} style={{ color: 'var(--color-anilist-blue)', marginBottom: '0.5rem' }} />
                  <div className="stat-value">{friendAnimeList.filter(e => e.status === 'COMPLETED').length}</div>
                  <div className="stat-label">Animes Vistos</div>
                </div>

                <div className="stat-item">
                  <Tv size={24} style={{ color: 'var(--color-accent-green)', marginBottom: '0.5rem' }} />
                  <div className="stat-value">{friendData.statistics?.anime?.episodesWatched || 0}</div>
                  <div className="stat-label">Episodios Vistos</div>
                </div>

                <div className="stat-item">
                  <Clock size={24} style={{ color: 'var(--color-accent-purple)', marginBottom: '0.5rem' }} />
                  <div className="stat-value">
                    {Math.round((friendData.statistics?.anime?.minutesWatched || 0) / 60)}
                  </div>
                  <div className="stat-label">Horas Vistas</div>
                </div>

                <div className="stat-item">
                  <BookOpen size={24} style={{ color: 'var(--color-anilist-blue)', marginBottom: '0.5rem' }} />
                  <div className="stat-value">{friendData.statistics?.manga?.count || 0}</div>
                  <div className="stat-label">Manga en Lista</div>
                </div>

                <div className="stat-item">
                  <BookOpen size={24} style={{ color: 'var(--color-accent-green)', marginBottom: '0.5rem' }} />
                  <div className="stat-value">{friendData.statistics?.manga?.chaptersRead || 0}</div>
                  <div className="stat-label">Capítulos Leídos</div>
                </div>
              </div>
            </div>

            {/* Lista de anime del amigo */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-display)', margin: 0 }}>Lista de Anime de {friendData.name}</h3>
                <button 
                  className="view-mode-toggle"
                  onClick={toggleViewMode}
                  title={viewMode === 'grid' ? 'Cambiar a Vista Lista' : 'Cambiar a Vista Mosaico'}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--color-text-primary)', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'var(--transition-smooth)' }}
                >
                  {viewMode === 'grid' ? <List size={18} /> : <Grid size={18} />}
                </button>
              </div>

              <div className="mylist-tabs">
                <button 
                  className={`mylist-tab-item ${friendMylistSubTab === 'CURRENT' ? 'active' : ''}`}
                  onClick={() => setFriendMylistSubTab('CURRENT')}
                >
                  <span>Viendo</span>
                  <span className="mylist-tab-count">
                    {friendAnimeList.filter(e => e.status === 'CURRENT').length}
                  </span>
                </button>
                <button 
                  className={`mylist-tab-item ${friendMylistSubTab === 'COMPLETED' ? 'active' : ''}`}
                  onClick={() => setFriendMylistSubTab('COMPLETED')}
                >
                  <span>Vistos</span>
                  <span className="mylist-tab-count">
                    {friendAnimeList.filter(e => e.status === 'COMPLETED').length}
                  </span>
                </button>
                <button 
                  className={`mylist-tab-item ${friendMylistSubTab === 'PLANNING' ? 'active' : ''}`}
                  onClick={() => setFriendMylistSubTab('PLANNING')}
                >
                  <span>Planeado</span>
                  <span className="mylist-tab-count">
                    {friendAnimeList.filter(e => e.status === 'PLANNING').length}
                  </span>
                </button>
              </div>

              {filteredList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-text-secondary)' }}>
                  <Tv size={36} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                  <p>Este usuario no tiene ningún anime en esta sección de su lista.</p>
                </div>
              ) : (
                <div className={`anime-grid ${viewMode === 'list' ? 'view-list' : ''}`}>
                  {groupedList.map((group) => {
                    const anime = group.mostRecent.media;
                    if (!anime) return null;
                    const isExpanded = expandedGroups[group.id];

                    return (
                      <div 
                        key={group.id} 
                        className={`anime-card ${group.items.length > 1 ? 'franchise-group-card' : ''} ${isExpanded ? 'expanded' : ''}`}
                        onClick={() => {
                          if (group.items.length > 1) {
                            setExpandedGroups(prev => ({
                              ...prev,
                              [group.id]: !prev[group.id]
                            }));
                          } else {
                            fetchAnimeDetails(anime.id);
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        {anime.status && (anime.status === 'RELEASING' || anime.status === 'NOT_YET_RELEASED') && (
                          <div className={`status-indicator ${anime.status.toLowerCase()}`} title={anime.status === 'RELEASING' ? 'En Emisión' : 'Próximamente'} />
                        )}

                        <div className="cover-wrapper" style={{ position: 'relative' }}>
                          <img 
                            src={anime.coverImage?.large || 'https://anilist.co/img/icons/icon.svg'} 
                            alt={anime.title?.userPreferred} 
                            className="anime-cover"
                          />
                          {group.items.length > 1 && (
                            <div className="franchise-count-badge">
                              {group.items.length} {group.items.length === 1 ? 'Temporada' : 'Temporadas'}
                            </div>
                          )}
                        </div>

                        <div className="anime-info">
                          <span className="anime-title" title={anime.title?.userPreferred}>
                            {anime.title?.userPreferred}
                          </span>
                          <div className="anime-meta">
                            <span style={{ color: 'var(--color-accent-green)', fontWeight: '600' }}>
                              {group.mostRecent.score ? `${group.mostRecent.score}/10` : 'Sin nota'}
                            </span>
                            <span>
                              {anime.episodes ? `${group.mostRecent.progress}/${anime.episodes} eps` : `${group.mostRecent.progress} eps`}
                            </span>
                          </div>
                        </div>

                        {group.items.length > 1 && (
                          <div className="franchise-expand-header">
                            <span>{isExpanded ? 'Ocultar temporadas' : 'Ver temporadas'}</span>
                            <span className={`arrow-icon ${isExpanded ? 'rotated' : ''}`}>▼</span>
                          </div>
                        )}

                        {isExpanded && (
                          <div className="franchise-seasons-list" onClick={(e) => e.stopPropagation()}>
                            {group.items.map((item) => {
                              const seasonMedia = item.media;
                              if (!seasonMedia) return null;
                              return (
                                <div 
                                  key={item.id} 
                                  className="franchise-season-item"
                                  onClick={() => fetchAnimeDetails(seasonMedia.id)}
                                  title="Ver detalles"
                                >
                                  <img 
                                    src={seasonMedia.coverImage?.large || 'https://anilist.co/img/icons/icon.svg'} 
                                    alt={seasonMedia.title?.userPreferred} 
                                    className="season-mini-cover"
                                  />
                                  <div className="season-item-info">
                                    <span className="season-item-title">{seasonMedia.title?.userPreferred}</span>
                                    <div className="season-item-meta">
                                      <span className="season-item-format">{seasonMedia.format || 'TV'}</span>
                                      <span className="season-item-progress">
                                        {seasonMedia.episodes ? `${item.progress}/${seasonMedia.episodes} eps` : `${item.progress} eps`}
                                      </span>
                                      <span className="season-item-score">{item.score ? `${item.score}/10` : 'Sin nota'}</span>
                                    </div>
                                  </div>
                                  <span className="view-details-arrow">→</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      }
      case 'mylist': {
        const userAnimeList = completedAnime;
        const filteredList = userAnimeList.filter(entry => entry.status === mylistSubTab);
        const groupedList = groupCompletedAnimeByFranchise(filteredList);
        
        return (
          <div className="card mylist-card">
            {/* Header with Title, View Mode toggle and Back to Profile button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', marginBottom: '0.25rem' }}>Mi Lista de Anime</h2>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                  Administra tus series en emisión, completadas y planeadas.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button 
                  className="view-mode-toggle"
                  onClick={toggleViewMode}
                  title={viewMode === 'grid' ? 'Cambiar a Vista Lista' : 'Cambiar a Vista Mosaico'}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--color-text-primary)', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'var(--transition-smooth)' }}
                >
                  {viewMode === 'grid' ? <List size={18} /> : <Grid size={18} />}
                </button>
                <button 
                  className="btn-secondary" 
                  onClick={() => handleTabClick('profile')}
                  style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                >
                  Volver al Perfil
                </button>
              </div>
            </div>

            {/* Sub-Tabs Nav: Viendo, Visto, Planeado */}
            <div className="mylist-tabs">
              <button 
                className={`mylist-tab-item ${mylistSubTab === 'CURRENT' ? 'active' : ''}`}
                onClick={() => setMylistSubTab('CURRENT')}
              >
                <span>Viendo</span>
                <span className="mylist-tab-count">
                  {userAnimeList.filter(e => e.status === 'CURRENT').length}
                </span>
              </button>
              <button 
                className={`mylist-tab-item ${mylistSubTab === 'COMPLETED' ? 'active' : ''}`}
                onClick={() => setMylistSubTab('COMPLETED')}
              >
                <span>Vistos</span>
                <span className="mylist-tab-count">
                  {userAnimeList.filter(e => e.status === 'COMPLETED').length}
                </span>
              </button>
              <button 
                className={`mylist-tab-item ${mylistSubTab === 'PLANNING' ? 'active' : ''}`}
                onClick={() => setMylistSubTab('PLANNING')}
              >
                <span>Planeado</span>
                <span className="mylist-tab-count">
                  {userAnimeList.filter(e => e.status === 'PLANNING').length}
                </span>
              </button>
            </div>

            {/* List Content */}
            {filteredList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--color-text-secondary)' }}>
                <Tv size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                <p>No tienes ningún anime en esta sección de tu lista.</p>
                <button 
                  className="btn-primary" 
                  onClick={() => handleTabClick('search')}
                  style={{ marginTop: '1.25rem' }}
                >
                  Buscar Animes para Añadir
                </button>
              </div>
            ) : (
              <div className={`anime-grid ${viewMode === 'list' ? 'view-list' : ''}`}>
                {groupedList.map((group) => {
                  const anime = group.mostRecent.media;
                  if (!anime) return null;
                  const isExpanded = !!expandedGroups[group.id];
                  
                  return (
                    <div 
                      key={group.id} 
                      className={`anime-card franchise-card ${isExpanded ? 'expanded' : ''}`}
                      onClick={() => setExpandedGroups(prev => ({ ...prev, [group.id]: !prev[group.id] }))}
                      style={{ height: 'fit-content' }}
                    >
                      {/* Live status indicator */}
                      {anime.status && (anime.status === 'RELEASING' || anime.status === 'NOT_YET_RELEASED') && (
                        <div className={`status-indicator ${anime.status.toLowerCase()}`} title={anime.status === 'RELEASING' ? 'En Emisión' : 'Próximamente'} />
                      )}
                      
                      {/* Main card cover */}
                      <div className="cover-wrapper" style={{ position: 'relative' }}>
                        <img 
                          src={anime.coverImage?.large || 'https://anilist.co/img/icons/icon.svg'} 
                          alt={anime.title?.userPreferred} 
                          className="anime-cover"
                        />
                        {/* Number of seasons / items badge */}
                        {group.items.length > 1 && (
                          <div className="franchise-count-badge">
                            {group.items.length} {group.items.length === 1 ? 'Temporada' : 'Temporadas'}
                          </div>
                        )}

                        {/* Quick '+' increment button for CURRENT (Viendo) tab on the main card (if collapsed or single entry) */}
                        {mylistSubTab === 'CURRENT' && (
                          <button 
                            className="quick-plus-btn"
                            onClick={(e) => handleQuickIncrement(group.mostRecent, e)}
                            title="Incrementar +1 Episodio"
                          >
                            <Plus size={16} />
                          </button>
                        )}
                      </div>

                      {/* Main card details */}
                      <div className="anime-info">
                        <span className="anime-title" title={anime.title?.userPreferred}>
                          {anime.title?.userPreferred}
                        </span>
                        <div className="anime-meta">
                          <span style={{ color: 'var(--color-accent-green)', fontWeight: '600' }}>
                            {group.mostRecent.score ? `${group.mostRecent.score}/10` : 'Sin nota'}
                          </span>
                          <span>
                            {anime.episodes ? `${group.mostRecent.progress}/${anime.episodes} eps` : `${group.mostRecent.progress} eps`}
                          </span>
                        </div>
                      </div>

                      {/* Expansion Arrow indicator */}
                      {group.items.length > 1 && (
                        <div className="franchise-expand-header">
                          <span>{isExpanded ? 'Ocultar temporadas' : 'Ver temporadas'}</span>
                          <span className={`arrow-icon ${isExpanded ? 'rotated' : ''}`}>▼</span>
                        </div>
                      )}

                      {/* Expanded list of seasons */}
                      {isExpanded && (
                        <div className="franchise-seasons-list" onClick={(e) => e.stopPropagation()}>
                          {group.items.map((item) => {
                            const seasonMedia = item.media;
                            if (!seasonMedia) return null;
                            return (
                              <div 
                                key={item.id} 
                                className="franchise-season-item"
                                onClick={() => fetchAnimeDetails(seasonMedia.id)}
                                title="Ver detalles y editar progreso"
                              >
                                <img 
                                  src={seasonMedia.coverImage?.large || 'https://anilist.co/img/icons/icon.svg'} 
                                  alt={seasonMedia.title?.userPreferred} 
                                  className="season-mini-cover"
                                />
                                <div className="season-item-info">
                                  <span className="season-item-title">{seasonMedia.title?.userPreferred}</span>
                                  <div className="season-item-meta">
                                    <span className="season-item-format">{seasonMedia.format || 'TV'}</span>
                                    <span className="season-item-progress">
                                      {seasonMedia.episodes ? `${item.progress}/${seasonMedia.episodes} eps` : `${item.progress} eps`}
                                    </span>
                                    <span className="season-item-score">{item.score ? `${item.score}/10` : 'Sin nota'}</span>
                                  </div>
                                </div>

                                {/* Quick '+' increment button for CURRENT tab in the season row */}
                                {mylistSubTab === 'CURRENT' && (
                                  <button 
                                    className="row-quick-plus-btn"
                                    onClick={(e) => handleQuickIncrement(item, e)}
                                    title="Incrementar +1 Episodio"
                                  >
                                    <Plus size={12} />
                                  </button>
                                )}

                                <span className="view-details-arrow">→</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      }
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
                <div className="stat-item clickable" onClick={() => { handleTabClick('mylist'); setMylistSubTab('COMPLETED'); }} style={{ cursor: 'pointer' }}>
                  <Tv size={24} style={{ color: 'var(--color-anilist-blue)', marginBottom: '0.5rem' }} />
                  <div className="stat-value">{completedAnime.filter(e => e.status === 'COMPLETED').length}</div>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', margin: 0 }}>Buscador de Anime</h2>
              <button 
                className="view-mode-toggle"
                onClick={toggleViewMode}
                title={viewMode === 'grid' ? 'Cambiar a Vista Lista' : 'Cambiar a Vista Mosaico'}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--color-text-primary)', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'var(--transition-smooth)' }}
              >
                {viewMode === 'grid' ? <List size={18} /> : <Grid size={18} />}
              </button>
            </div>
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
              <>
                <div className={`anime-grid ${viewMode === 'list' ? 'view-list' : ''}`}>
                  {searchResults.map((anime) => (
                    <div key={anime.id} className="anime-card" onClick={() => fetchAnimeDetails(anime.id)}>
                      {anime.status && (anime.status === 'RELEASING' || anime.status === 'NOT_YET_RELEASED') && (
                        <div className={`status-indicator ${anime.status.toLowerCase()}`} title={anime.status === 'RELEASING' ? 'En Emisión' : 'Próximamente'} />
                      )}
                      <div className="cover-wrapper" style={{ position: 'relative' }}>
                        <img 
                          src={anime.coverImage?.large || 'https://anilist.co/img/icons/icon.svg'} 
                          alt={anime.title?.userPreferred} 
                          className="anime-cover"
                        />
                      </div>
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

                {/* Infinite Scroll Loader Indicator */}
                {loadingMore && (
                  <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                    <div className="loader" style={{ width: '30px', height: '30px', margin: '0 auto' }}></div>
                    <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.5rem', fontSize: '0.85rem' }}>
                      Cargando más animes...
                    </p>
                  </div>
                )}

                {/* Intersection Anchor */}
                <div id="search-infinite-anchor" style={{ height: '20px', margin: '1rem 0' }}></div>
              </>
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

            {pendingRequests.length > 0 && (
              <div style={{ marginBottom: '2rem', padding: '1.25rem', background: 'rgba(255,100,100,0.1)', border: '1px solid rgba(255,100,100,0.2)', borderRadius: '12px' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#ff8888' }}>Solicitudes Pendientes ({pendingRequests.length})</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {pendingRequests.map(req => (
                    <div key={req.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <img src={req.avatar || 'https://anilist.co/img/icons/icon.svg'} alt={req.name} style={{ width: '36px', height: '36px', borderRadius: '50%' }} />
                        <span style={{ fontWeight: '500' }}>{req.name}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => handleAcceptRequest(req.id)} className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', backgroundColor: 'var(--color-anilist-blue)' }}>Aceptar</button>
                        <button onClick={() => handleRejectRequest(req.id)} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: 'rgba(255,0,0,0.2)', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer' }}>Rechazar</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Buscador de amigos */}
            <form onSubmit={handleAddFriend} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.25rem', marginBottom: '1.75rem', padding: '1.25rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: '500', color: 'var(--color-text-secondary)' }}>
                Buscar y Agregar Amigos (Usuario de AniList)
              </label>
              <div className="search-input-group">
                <input 
                  type="text" 
                  value={friendSearchQuery}
                  onChange={(e) => setFriendSearchQuery(e.target.value)}
                  placeholder="Ej: Rozas22, iker_..."
                  style={{ flex: '1 1 200px', padding: '0.65rem 1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'var(--color-text-primary)', fontSize: '0.95rem', outline: 'none' }}
                />
                <button 
                  type="submit" 
                  disabled={addingFriend || !friendSearchQuery.trim()}
                  className="btn-primary"
                  style={{ flex: '1 1 auto', padding: '0.65rem 1.25rem', fontSize: '0.9rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.25rem' }}
                >
                  {addingFriend ? 'Agregando...' : 'Agregar'}
                </button>
              </div>
              {friendAddError && (
                <span style={{ fontSize: '0.85rem', color: 'var(--color-accent-red)', marginTop: '0.25rem' }}>
                  ⚠️ {friendAddError}
                </span>
              )}
            </form>

            {loadingFriends ? (
              <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                <div className="loader" style={{ width: '30px', height: '30px', margin: '0 auto 1rem auto' }}></div>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>Cargando amigos...</p>
              </div>
            ) : friends.length === 0 ? (
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', marginTop: '2rem', textAlign: 'center', lineHeight: '1.6' }}>
                Aún no hay amigos registrados en el grupo.<br />
                ¡Usa el buscador superior para agregar a tus amigos por su usuario de AniList!
              </p>
            ) : (
              <div className="friends-list">
                {friends.map((friend) => (
                  <div 
                    key={friend.id} 
                    onClick={() => handleNavigateToFriend(friend.name)}
                    className="friend-item"
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', transition: 'var(--transition-smooth)' }}
                    title={`Ver perfil interno de ${friend.name}`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <img 
                        src={friend.avatar || 'https://anilist.co/img/icons/icon.svg'} 
                        alt={friend.name} 
                        className="friend-avatar" 
                      />
                      <div className="friend-info" style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="friend-name" style={{ fontWeight: '600', color: 'var(--color-text-primary)' }}>{friend.name}</span>
                        <span className="friend-status" style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                          Activo: {new Date(friend.updatedAt).toLocaleDateString('es-ES', { 
                            day: 'numeric', 
                            month: 'short', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                    </div>
                    <span className="view-details-arrow" style={{ color: 'var(--color-text-secondary)', transition: 'var(--transition-smooth)' }}>→</span>
                  </div>
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
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', marginTop: '1.5rem' }}>
                <button 
                  onClick={handleLoginClick} 
                  disabled={loading}
                  className="btn-primary"
                  style={{ padding: '1rem 2rem', fontSize: '1.1rem', width: '100%', maxWidth: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <LogIn size={20} />
                  {loading ? 'Redirigiendo...' : 'Iniciar Sesión con AniList'}
                </button>
                
                {showInstallBtn && (
                  <button 
                    onClick={handleInstallApp} 
                    className="btn-secondary"
                    style={{ padding: '0.8rem 1.5rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid rgba(255,255,255,0.15)', width: '100%', maxWidth: '320px', justifyContent: 'center' }}
                  >
                    <Download size={18} />
                    Instalar Aplicación
                  </button>
                )}
              </div>
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
            className={`sidebar-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => handleTabClick('profile')}
          >
            <User size={18} />
            <span>Mi Perfil</span>
          </button>
          
          <button 
            className={`sidebar-nav-item ${activeTab === 'mylist' ? 'active' : ''}`}
            onClick={() => handleTabClick('mylist')}
          >
            <List size={18} />
            <span>Mi Lista</span>
          </button>
          
          <button 
            className={`sidebar-nav-item ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => handleTabClick('search')}
          >
            <Search size={18} />
            <span>Buscar Anime</span>
          </button>
          
          <button 
            className={`sidebar-nav-item ${activeTab === 'group' || activeTab === 'friend-profile' ? 'active' : ''}`}
            onClick={() => handleTabClick('group')}
            style={{ position: 'relative' }}
          >
            <Users size={18} />
            <span>El Grupo</span>
            {pendingRequests.length > 0 && (
              <div style={{ position: 'absolute', top: 10, right: 15, width: 8, height: 8, backgroundColor: 'red', borderRadius: '50%' }}></div>
            )}
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
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {showInstallBtn && (
              <button 
                onClick={handleInstallApp} 
                className="btn-primary" 
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: 'var(--color-accent-purple)', display: 'flex', alignItems: 'center', gap: '0.25rem', border: 'none' }}
              >
                <Download size={14} />
                Instalar
              </button>
            )}
            <button onClick={handleLogout} className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
              <LogOut size={14} />
              Salir
            </button>
          </div>
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
            className={`bottom-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => handleTabClick('profile')}
          >
            <User size={20} />
            <span>Perfil</span>
          </button>
          
          <button 
            className={`bottom-nav-item ${activeTab === 'mylist' ? 'active' : ''}`}
            onClick={() => handleTabClick('mylist')}
          >
            <List size={20} />
            <span>Lista</span>
          </button>
          
          <button 
            className={`bottom-nav-item ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => handleTabClick('search')}
          >
            <Search size={20} />
            <span>Buscar</span>
          </button>
          
          <button 
            className={`bottom-nav-item ${activeTab === 'group' || activeTab === 'friend-profile' ? 'active' : ''}`}
            onClick={() => handleTabClick('group')}
            style={{ position: 'relative' }}
          >
            <Users size={20} />
            <span>Grupo</span>
            {pendingRequests.length > 0 && (
              <div style={{ position: 'absolute', top: 5, right: '25%', width: 8, height: 8, backgroundColor: 'red', borderRadius: '50%' }}></div>
            )}
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

      {/* PWA UPDATE BANNER */}
      {showUpdateBanner && (
        <div className="update-banner" onClick={handleUpdateApp}>
          ✨ ¡Hay una nueva versión disponible! Haz clic aquí para actualizar.
        </div>
      )}
    </div>
  );
}
