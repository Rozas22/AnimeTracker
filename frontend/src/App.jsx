import React, { useState, useEffect } from 'react';
import { LogIn, LogOut, User, Users, Tv, BookOpen, Clock, Settings, ShieldAlert, Search, X, Star, Plus, List, Grid, Download, BarChart2, TrendingUp, Award, Palette, Play, Zap, Bell, Check, PieChart, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Callback from './components/Callback';
import { useTheme, ACCENT_COLORS } from './ThemeContext.jsx';
import confetti from 'canvas-confetti';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const ITEMS_PER_PAGE = 24;

const TROPHY_CONFIG = [
  { level: 10, title: 'Novato de Bronce', frameName: 'bronze', frameLabel: 'Marco de Bronce' },
  { level: 20, title: 'Aprendiz', frameName: null, frameLabel: 'Sin Marco' },
  { level: 30, title: 'Maestro de Plata', frameName: 'silver', frameLabel: 'Marco de Plata' },
  { level: 40, title: 'Veterano', frameName: null, frameLabel: 'Sin Marco' },
  { level: 50, title: 'Leyenda del Anime', frameName: 'gold', frameLabel: 'Marco de Oro' },
  { level: 60, title: 'Mito', frameName: null, frameLabel: 'Sin Marco' },
  { level: 70, title: 'Semi-Dios', frameName: null, frameLabel: 'Sin Marco' },
  { level: 80, title: 'Dios', frameName: null, frameLabel: 'Sin Marco' },
  { level: 90, title: 'Titán', frameName: null, frameLabel: 'Sin Marco' },
  { level: 100, title: 'Completista', frameName: null, frameLabel: 'Sin Marco' }
];

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
  const [anilistFriends, setAnilistFriends] = useState([]);
  const [notificationTab, setNotificationTab] = useState('episodes');
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
  const [friendError, setFriendError] = useState(null);
  const [togglingFollow, setTogglingFollow] = useState(false);
  const [friendMylistSubTab, setFriendMylistSubTab] = useState('CURRENT');

  // PWA Update states
  const [swRegistration, setSwRegistration] = useState(null);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);

  // Translated synopsis state
  const [translatedDescription, setTranslatedDescription] = useState(null);
  const [translatingDesc, setTranslatingDesc] = useState(false);

  // Mobile Settings Modal state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedFrame, setSelectedFrame] = useState(localStorage.getItem('animeTrackerSelectedFrame') || 'none');
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [levelUpData, setLevelUpData] = useState(null);
  const [selectedTrophy, setSelectedTrophy] = useState(null);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [episodeNotifications, setEpisodeNotifications] = useState([]);
  const [dismissedEpNotifs, setDismissedEpNotifs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('animeTrackerDismissedEpNotifs') || '[]');
    } catch {
      return [];
    }
  });
  const [readEpNotifs, setReadEpNotifs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('animeTrackerReadEpNotifs') || '[]');
    } catch {
      return [];
    }
  });
  const [socialNotifications, setSocialNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('animeTrackerSocialNotifs');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Theme
  const { accentColor, setAccentColor, styleMode, setStyleMode } = useTheme();

  // Fetch notifications and friends removed (app is now read-only for friends)
  useEffect(() => {
    // Only refresh user data on token change
    if (token) {
      refreshUserData();
    }
  }, [token]);

  // Computed notifications are now below completedAnime declaration

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
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;
      setSwRegistration(reg);

      // A. Already waiting (e.g. user refreshed while update was pending)
      if (reg.waiting) {
        setShowUpdateBanner(true);
      }

      // B. A new SW just installed and is waiting
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setShowUpdateBanner(true);
          }
        });
      });
    });

    // C. After skipWaiting fires and the new SW takes control —
    //    reload only if the user clicked the banner (refreshing flag).
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
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

  // Force fetch Anilist following when entering Group tab
  useEffect(() => {
    if (activeTab === 'group') {
      fetchAnilistFollowing();
    }
  }, [activeTab]);

  const fetchFriendProfile = async (username) => {
    if (!username) return;
    setFriendLoading(true);
    setFriendError('');
    setFriendData(null);
    setFriendAnimeList([]);

    // Failsafe timeout to prevent infinite loading state
    const timeoutId = setTimeout(() => {
      setFriendLoading(false);
      setFriendError('Tiempo de espera agotado al cargar el perfil.');
    }, 15000);

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
        }
      }
    `;

    const makeRequest = async (retries = 1) => {
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

        if (response.status === 429) {
          if (retries > 0) {
            setFriendError('Servidor saturado, intentando de nuevo en unos segundos...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            setFriendError(null);
            return makeRequest(retries - 1);
          } else {
            throw new Error('Demasiadas peticiones. Inténtalo más tarde.');
          }
        }

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
        clearTimeout(timeoutId);
        setFriendLoading(false);
      }
    };
    await makeRequest();
  };

  const fetchFriendAnimeList = async (userId) => {
    const query = `
      query ($userId: Int) {
        MediaListCollection(userId: $userId, type: ANIME) {
          lists {
            name
            isCustomList
            status
            entries {
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
                duration
                status
                startDate {
                  year
                  month
                  day
                }
              }
            }
          }
        }
      }
    `;
    const makeRequest = async (retries = 1) => {
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

        if (response.status === 429) {
          if (retries > 0) {
            setFriendError('Servidor saturado, cargando lista en unos segundos...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            setFriendError(null);
            return makeRequest(retries - 1);
          } else {
            throw new Error('Demasiadas peticiones. Inténtalo más tarde.');
          }
        }

        const result = await response.json();
        if (!result.errors && result.data?.MediaListCollection?.lists) {
          const lists = result.data.MediaListCollection.lists;
          const allEntries = [];
          lists.forEach(list => {
            if (list.entries) {
              allEntries.push(...list.entries);
            }
          });
          setFriendAnimeList(allEntries);
        }
      } catch (err) {
        console.error('Error fetching friend anime list:', err);
      }
    };
    await makeRequest();
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

  // Compute global level based on arithmetic progression
  const totalEpsForLevel = completedAnime.reduce((s, e) => s + (e.progress || 0), 0);
  let computedLevel = 1;
  let episodiosRestantes = totalEpsForLevel;
  let episodiosParaSiguienteNivel = computedLevel * 25;

  while (episodiosRestantes >= episodiosParaSiguienteNivel) {
    episodiosRestantes -= episodiosParaSiguienteNivel;
    computedLevel++;
    episodiosParaSiguienteNivel = computedLevel * 25;
  }
  
  const progresoPorcentaje = (episodiosRestantes / episodiosParaSiguienteNivel) * 100;
  
  let userTitle = 'Novato';
  if (computedLevel >= 50) userTitle = 'Leyenda';
  else if (computedLevel >= 26) userTitle = 'Veterano';
  else if (computedLevel >= 11) userTitle = 'Aprendiz';

  // Check for level up
  useEffect(() => {
    if (completedAnime.length > 0 && computedLevel > 1) {
      const savedLevel = parseInt(localStorage.getItem('animeTrackerSavedLevel') || '1', 10);
      console.log('Nivel guardado:', savedLevel, 'Nivel actual:', computedLevel); // DEBUG
      if (computedLevel > savedLevel) {
        // Trigger Level Up
        setLevelUpData({ level: computedLevel, title: userTitle, totalEps: totalEpsForLevel });
        setShowLevelUpModal(true);
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          zIndex: 9999
        });
        localStorage.setItem('animeTrackerSavedLevel', computedLevel.toString());
      } else if (computedLevel < savedLevel) {
        // Fallback sync
        localStorage.setItem('animeTrackerSavedLevel', computedLevel.toString());
      }
    }
  }, [computedLevel, completedAnime.length, userTitle, totalEpsForLevel]);

  // Compute Episode Notifications
  useEffect(() => {
    if (!completedAnime || completedAnime.length === 0) return;
    const watching = completedAnime.filter(e => e.status === 'CURRENT' && e.media?.nextAiringEpisode);
    const newNotifs = [];
    watching.forEach(entry => {
      const nextEp = entry.media.nextAiringEpisode.episode;
      if (nextEp > entry.progress + 1) {
        const latestAvailable = nextEp - 1;
        const notifId = `ep_${entry.media.id}_${latestAvailable}`;
        
        // Skip if this notification has been dismissed
        if (dismissedEpNotifs.includes(notifId)) return;

        // Calculate elapsed time from nextAiringEpisode weekly cycle
        const timeUntil = entry.media.nextAiringEpisode.timeUntilAiring || 0;
        const secondsAgo = (604800 - (timeUntil % 604800)) % 604800;
        const hoursAgo = Math.floor(secondsAgo / 3600);
        const daysAgo = Math.floor(hoursAgo / 24);
        let timeText = '';
        if (daysAgo > 0) {
          timeText = `Hace ${daysAgo} ${daysAgo === 1 ? 'día' : 'días'}`;
        } else {
          timeText = `Hace ${Math.max(1, hoursAgo)} ${hoursAgo <= 1 ? 'hora' : 'horas'}`;
        }

        newNotifs.push({
          id: notifId,
          type: 'episode',
          anime: entry.media,
          unseenCount: latestAvailable - entry.progress,
          latestAvailable,
          timeText,
          isRead: readEpNotifs.includes(notifId)
        });
      }
    });
    setEpisodeNotifications(newNotifs);
  }, [completedAnime, dismissedEpNotifs, readEpNotifs]);
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
        MediaListCollection(userId: $userId, type: ANIME) {
          lists {
            name
            isCustomList
            status
            entries {
              id
              status
              progress
              score(format: POINT_10)
              updatedAt
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
                duration
                genres
                studios(isMain: true) {
                  nodes {
                    name
                  }
                }
                status
                nextAiringEpisode {
                  episode
                  timeUntilAiring
                }
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
      if (!result.errors && result.data?.MediaListCollection?.lists) {
        const lists = result.data.MediaListCollection.lists;
        const allEntries = [];
        lists.forEach(list => {
          if (list.entries) {
            allEntries.push(...list.entries);
          }
        });
        setCompletedAnime(allEntries);
      }
    } catch (err) {
      console.error('Error fetching user anime list:', err);
    }
  };

  const fetchSocialActivity = async () => {
    if (!token) return;
    const query = `
      query {
        Page(page: 1, perPage: 5) {
          activities(type: FOLLOWING, sort: ID_DESC) {
            ... on FollowingActivity {
              id
              createdAt
              user { id name avatar { large } }
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
          'Accept': 'application/json'
        },
        body: JSON.stringify({ query })
      });
      const data = await response.json();
      if (!data.errors && data.data?.Page?.activities) {
        const activities = data.data.Page.activities.filter(a => a && a.user);
        setSocialNotifications(prev => {
          let newNotifs = [...prev];
          activities.forEach(act => {
            if (!newNotifs.some(n => n.id === act.id)) {
              newNotifs.unshift({ ...act, isRead: false });
            }
          });
          newNotifs = newNotifs.slice(0, 20);
          localStorage.setItem('animeTrackerSocialNotifs', JSON.stringify(newNotifs));
          return newNotifs;
        });
      }
    } catch (err) {
      console.error('Error fetching social activity:', err);
    }
  };

  const dismissSocialNotification = (id) => {
    setSocialNotifications(prev => {
      const newNotifs = prev.filter(n => n.id !== id);
      localStorage.setItem('animeTrackerSocialNotifs', JSON.stringify(newNotifs));
      return newNotifs;
    });
  };

  const dismissEpisodeNotification = (id) => {
    setDismissedEpNotifs(prev => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      localStorage.setItem('animeTrackerDismissedEpNotifs', JSON.stringify(next));
      return next;
    });
  };

  const markEpisodeNotificationAsRead = (id) => {
    setReadEpNotifs(prev => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      localStorage.setItem('animeTrackerReadEpNotifs', JSON.stringify(next));
      return next;
    });
  };

  const handleOpenNotificationCenter = () => {
    setShowNotificationCenter(true);
    // Mark all current episode notifications as read
    const newReadIds = [...readEpNotifs];
    let changed = false;
    episodeNotifications.forEach(notif => {
      if (!newReadIds.includes(notif.id)) {
        newReadIds.push(notif.id);
        changed = true;
      }
    });
    if (changed) {
      setReadEpNotifs(newReadIds);
      localStorage.setItem('animeTrackerReadEpNotifs', JSON.stringify(newReadIds));
    }

    // Mark all social notifications as read
    setSocialNotifications(prev => {
      const updated = prev.map(n => ({ ...n, isRead: true }));
      localStorage.setItem('animeTrackerSocialNotifs', JSON.stringify(updated));
      return updated;
    });
  };

  const toggleNotificationCenter = () => {
    if (!showNotificationCenter) {
      handleOpenNotificationCenter();
    } else {
      setShowNotificationCenter(false);
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
          avatar { large }
          siteUrl
          about (asHtml: true)
          statistics {
            anime { count episodesWatched minutesWatched }
            manga { count chaptersRead }
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
      
      if (viewer.id) {
        await fetchUserAnimeList(viewer.id);
        await fetchAnilistFollowing();
        await fetchSocialActivity();
      }
    } catch (err) {
      console.error('Error refreshing user data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabClick = (tabName) => {
    setActiveTab(tabName);
    window.history.pushState(null, '', '/');
  };

  const fetchAnilistFollowing = async () => {
    if (!token) {
      console.log('Token presente:', false);
      return;
    }
    console.log('Token presente:', true);

    const userId = userData?.id;
    if (!userId) {
      console.log('Esperando a que userData.id esté disponible...');
      return;
    }

    const query = `
      query ($userId: Int!) {
        Page(page: 1, perPage: 100) {
          following(userId: $userId) {
            id
            name
            avatar { large }
          }
        }
      }
    `;
    
    const variables = { userId };
    
    console.log('Query que se está enviando:', JSON.stringify(query));
    console.log('Variables que se están enviando:', JSON.stringify(variables));

    const makeRequest = async (retries = 1) => {
      try {
        const response = await fetch('https://graphql.anilist.co', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            query: query,
            variables: variables
          })
        });
        
        if (response.status === 429) {
          if (retries > 0) {
            setFriendError('Servidor saturado, intentando de nuevo en unos segundos...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            setFriendError(null);
            return makeRequest(retries - 1);
          } else {
            throw new Error('Too Many Requests');
          }
        }
        
        const data = await response.json();
        
        if (data.errors) {
          console.log('Error detallado de AniList:', data.errors);
          return;
        }

        if (data.data?.Page?.following) {
          setAnilistFriends(data.data.Page.following);
        }
      } catch (err) {
        console.error('Error fetching anilist following:', err);
      }
    };
    await makeRequest();
  };

  const handleFollowUser = async (userId) => {
    if (!token) {
      showToast('Debes iniciar sesión para seguir a usuarios.');
      return;
    }
    
    const parsedUserId = parseInt(userId, 10);
    console.log('Enviando mutación con ID:', parsedUserId);
    
    setTogglingFollow(true);
    const query = `
      mutation ($userId: Int) {
        ToggleFollow(userId: $userId) {
          id
          isFollowing
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
        body: JSON.stringify({ query, variables: { userId: parsedUserId } }),
      });
      
      const result = await response.json();
      if (result.errors) {
        throw new Error(result.errors[0].message || 'Error al modificar seguimiento.');
      }
      
      const isNowFollowing = result.data.ToggleFollow.isFollowing;
      showToast(isNowFollowing ? 'Siguiendo al usuario' : 'Has dejado de seguir al usuario');
      
      await fetchAnilistFollowing();
    } catch (err) {
      console.error('Error toggling follow:', err);
      showToast('Error al modificar seguimiento');
    } finally {
      setTogglingFollow(false);
    }
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
        const dateA = a?.media?.startDate;
        const dateB = b?.media?.startDate;
        
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

      if (mostRecentEntry) {
        groups.push({
          id: mostRecentEntry.id || media.id, // Group identifier (recent entry's list ID)
          mostRecent: mostRecentEntry,
          items: component // All items in the franchise, ordered chronologically
        });
      }
    });

    // Sort the groups by recent entry's ID in descending order (latest completed first)
    groups.sort((a, b) => (b.mostRecent?.id || 0) - (a.mostRecent?.id || 0));

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

  const handleFrameSelect = (frame) => {
    setSelectedFrame(frame);
    localStorage.setItem('animeTrackerSelectedFrame', frame);
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
          mediaListEntry {
            status
            progress
          }
        }
      }
    }`;

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
      // Kick off translation immediately (non-blocking)
      translateDescription(media.description);

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

  // Translate description to Spanish lazily (called after modal opens)
  const translateDescription = async (rawHtml) => {
    if (!rawHtml) return;
    setTranslatedDescription(null);
    setTranslatingDesc(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawHtml })
      });
      if (response.ok) {
        const data = await response.json();
        setTranslatedDescription(data.translated || null);
      }
    } catch (err) {
      console.error('Translation failed, showing original:', err);
    } finally {
      setTranslatingDesc(false);
    }
  };

  const closeModal = () => {
    setSelectedAnime(null);
    setModalOpen(false);
    setShowEditForm(false);
    setTranslatedDescription(null);
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
                
                {userData && userData.id !== friendData.id && (
                  <div style={{ marginTop: '1rem' }}>
                    <button 
                      className={`btn-primary ${anilistFriends.some(f => f.id === friendData.id) ? 'following' : ''}`}
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
                        <><Users size={16} /> Agregar</>
                      )}
                    </button>
                  </div>
                )}
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
                  <div className="stat-value">
                    {friendAnimeList.reduce((sum, e) => sum + (e.progress || 0), 0)}
                  </div>
                  <div className="stat-label">Episodios Vistos</div>
                </div>

                <div className="stat-item">
                  <Clock size={24} style={{ color: 'var(--color-accent-purple)', marginBottom: '0.5rem' }} />
                  <div className="stat-value">
                    {Math.round(
                      friendAnimeList.reduce((sum, e) => sum + (e.progress || 0) * (e.media?.duration || 24), 0) / 60
                    )}
                  </div>
                  <div className="stat-label">Horas Vistas</div>
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
          <div className="card profile-card" style={{ position: 'relative' }}>
            {/* Mobile Settings FAB */}
            <button className="mobile-settings-fab" onClick={() => setShowSettingsModal(true)}>
              <Settings size={20} />
            </button>
            {/* LEFT COLUMN: identity + aesthetics */}
            <div className="profile-col-left">
              <div className="profile-header">
                <img 
                  src={userData.avatar?.large || 'https://anilist.co/img/icons/icon.svg'} 
                  alt={userData.name} 
                  className={`avatar ${selectedFrame !== 'none' ? `frame-${selectedFrame}` : ''}`} 
                />
                <div className="profile-meta">
                  <h2 className={computedLevel >= 50 ? 'epic-name' : ''}>
                    Bienvenido, {userData.name}
                  </h2>
                  <div 
                    className="level-badge" 
                    title={`Faltan ${episodiosParaSiguienteNivel - episodiosRestantes} capítulos para el Nivel ${computedLevel + 1}`}
                  >
                    <Star size={14} style={{ color: 'var(--accent)' }} />
                    <span>Nivel <strong>{computedLevel}</strong> - {userTitle}</span>
                  </div>
                  <p style={{ marginTop: '0.5rem' }}>ID de AniList: #{userData.id}</p>
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

              {/* LEVEL SYSTEM */}
              {(() => {
                const totalEpsForLevel = completedAnime.reduce((s, e) => s + (e.progress || 0), 0);
                
                let nivelActual = 1;
                let episodiosRestantes = totalEpsForLevel;
                let episodiosParaSiguienteNivel = nivelActual * 25;

                while (episodiosRestantes >= episodiosParaSiguienteNivel) {
                  episodiosRestantes -= episodiosParaSiguienteNivel;
                  nivelActual++;
                  episodiosParaSiguienteNivel = nivelActual * 25;
                }

                const progresoPorcentaje = (episodiosRestantes / episodiosParaSiguienteNivel) * 100;

                let title = 'Novato';
                if (nivelActual >= 50) title = 'Leyenda';
                else if (nivelActual >= 20) title = 'Viciado';
                else if (nivelActual >= 10) title = 'Aficionado';

                return (
                  <>
                  <div className="profile-level-container">
                    <div className="level-header">
                      <span className="level-number">Nivel {nivelActual}</span>
                      <span className="level-title" style={{ color: 'var(--accent)' }}>{title}</span>
                    </div>
                    <div className="level-bar-track">
                      <div className="level-bar-fill" style={{ width: `${progresoPorcentaje}%`, background: 'var(--accent)', boxShadow: '0 0 10px var(--accent-glow)' }} />
                    </div>
                    <div className="level-progress-text">
                      Progreso: {episodiosRestantes} / {episodiosParaSiguienteNivel} para el siguiente nivel
                    </div>
                    <button 
                      className="btn-secondary" 
                      style={{ marginTop: '1rem', width: '100%', border: '1px dashed var(--accent)', color: 'var(--accent)' }} 
                      onClick={() => {
                        setLevelUpData({ level: nivelActual, title: title, totalEps: totalEpsForLevel });
                        setShowLevelUpModal(true);
                        confetti({
                          particleCount: 150,
                          spread: 70,
                          origin: { y: 0.6 },
                          zIndex: 9999
                        });
                      }}
                    >
                      Probar Animación de Nivel
                    </button>
                  </div>
                  
                  {/* TROPHY GALLERY */}
                  <div style={{ marginTop: '2rem', width: '100%' }}>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>Galería de Trofeos</h3>
                    <div className="trophy-grid">
                      {TROPHY_CONFIG.map(trophy => {
                        const isUnlocked = computedLevel >= trophy.level;
                        const lastSavedLevel = parseInt(localStorage.getItem('animeTrackerSavedLevel') || '1', 10);
                        const isRecentlyUnlocked = isUnlocked && lastSavedLevel < trophy.level;
                        
                        return (
                          <motion.div 
                            key={trophy.level} 
                            className={`trophy-card ${isUnlocked ? 'trophy-unlocked' : 'trophy-locked'}`}
                            onClick={() => setSelectedTrophy({...trophy, isUnlocked})}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            animate={isRecentlyUnlocked ? { y: [0, -10, 0] } : {}}
                            transition={isRecentlyUnlocked ? { repeat: Infinity, duration: 1.5 } : {}}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="trophy-icon-wrapper">
                              {isUnlocked ? <Award size={24} /> : <Lock size={20} />}
                            </div>
                            <h4 className="trophy-title">Nivel {trophy.level}</h4>
                            <p className="trophy-req">{isUnlocked ? 'Desbloqueado' : 'Bloqueado'}</p>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </>
                );
              })()}

              {userData.about && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem', width: '100%' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', color: 'var(--color-text-primary)' }}>Sobre mí</h3>
                  <div 
                    style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem' }} 
                    dangerouslySetInnerHTML={{ __html: userData.about }}
                  />
                </div>
              )}

              {/* ─── VIENDO AHORA (Movido a columna izquierda) ─── */}
              {(() => {
                const watching = completedAnime
                  .filter(e => e.status === 'CURRENT')
                  .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
                if (!watching) return null;
                const pct = watching.media?.episodes
                  ? Math.round((watching.progress / watching.media.episodes) * 100)
                  : null;
                return (
                  <div className="profile-now-card">
                    <div className="profile-now-badge">
                      <Play size={12} style={{ marginRight: '4px' }} /> VIENDO AHORA
                    </div>
                    <div className="profile-now-body">
                      <img
                        src={watching.media?.coverImage?.large}
                        alt={watching.media?.title?.userPreferred}
                        className="profile-now-cover"
                        onClick={() => { handleTabClick('mylist'); setMylistSubTab('CURRENT'); }}
                        style={{ cursor: 'pointer' }}
                      />
                      <div className="profile-now-info">
                        <p className="profile-now-title">{watching.media?.title?.userPreferred}</p>
                        <p className="profile-now-progress">
                          Episodio {watching.progress}{watching.media?.episodes ? ` / ${watching.media.episodes}` : ''}
                        </p>
                        {pct !== null && (
                          <div className="profile-now-bar-track">
                            <div className="profile-now-bar-fill" style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                        )}
                        <p className="profile-now-pct">{pct !== null ? `${pct}% completado` : 'En progreso'}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* RIGHT COLUMN: stats */}
            <div className="profile-col-right">
              <div className="profile-stats-section">
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', color: 'var(--color-text-primary)' }}>Tus Estadísticas en AniList</h3>
                <div className="stats-grid">
                  <div className="stat-item clickable" onClick={() => { handleTabClick('mylist'); setMylistSubTab('COMPLETED'); }} style={{ cursor: 'pointer' }}>
                    <Tv size={24} style={{ color: 'var(--color-anilist-blue)', marginBottom: '0.5rem' }} />
                    <div className="stat-value">{completedAnime.filter(e => e.status === 'COMPLETED').length}</div>
                    <div className="stat-label">Animes Vistos</div>
                  </div>

                  <div className="stat-item">
                    <Tv size={24} style={{ color: 'var(--color-accent-green)', marginBottom: '0.5rem' }} />
                    <div className="stat-value">
                      {completedAnime.reduce((sum, e) => sum + (e.progress || 0), 0)}
                    </div>
                    <div className="stat-label">Episodios Vistos</div>
                  </div>

                  <div className="stat-item">
                    <Clock size={24} style={{ color: 'var(--color-accent-purple)', marginBottom: '0.5rem' }} />
                    <div className="stat-value">
                      {Math.round(
                        completedAnime.reduce((sum, e) => sum + (e.progress || 0) * (e.media?.duration || 24), 0) / 60
                      )}
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
            </div>

            {/* Token inspector removed */}

            {/* ─── LOGROS ───────────────────────────────────────── */}
            {(() => {
              const totalEps   = completedAnime.reduce((s, e) => s + (e.progress || 0), 0);
              const totalHrs   = Math.round(completedAnime.reduce((s, e) => s + (e.progress || 0) * (e.media?.duration || 24), 0) / 60);
              const doneCount  = completedAnime.filter(e => e.status === 'COMPLETED').length;
              const scored     = completedAnime.filter(e => e.score > 0);
              const avgSc      = scored.length ? scored.reduce((s, e) => s + e.score, 0) / scored.length : 0;
              const allBadges  = [
                { id: 'eps100',    icon: <Zap   size={22} />, label: 'Maratonista',     desc: '100+ episodios vistos',    color: '#f59e0b', earned: totalEps >= 100 },
                { id: 'eps1000',   icon: <Zap   size={22} />, label: 'Ultra Maratón',   desc: '1000+ episodios',          color: '#ef4444', earned: totalEps >= 1000 },
                { id: 'comp50',    icon: <Award size={22} />, label: 'Coleccionista',   desc: '50+ animes completados',   color: '#3db4f2', earned: doneCount >= 50 },
                { id: 'comp100',   icon: <Award size={22} />, label: 'Veterano',        desc: '100+ animes completados',  color: '#c084fc', earned: doneCount >= 100 },
                { id: 'hrs100',    icon: <Clock size={22} />, label: 'Sin Vida Social', desc: '100+ horas de anime',      color: '#10b981', earned: totalHrs >= 100 },
                { id: 'score8',    icon: <Star  size={22} />, label: 'Crítico Exigente', desc: 'Puntuación media ≥ 8',  color: '#f59e0b', earned: scored.length > 0 && avgSc >= 8 },
                { id: 'firstscore',icon: <Star  size={22} />, label: 'Primer Voto',    desc: 'Puntuaste un anime',       color: '#a3e635', earned: scored.length > 0 },
                { id: 'watching',  icon: <Play  size={22} />, label: 'En Marcha',      desc: 'Tienes animes en progreso',color: '#3db4f2', earned: completedAnime.some(e => e.status === 'CURRENT') },
              ];
              const earned = allBadges.filter(b => b.earned);
              if (earned.length === 0) return null;
              return (
                <div className="profile-achievements-card" style={{ marginBottom: '1.25rem' }}>
                  <h3 className="profile-section-title">
                    <Award size={16} style={{ color: 'var(--accent)' }} /> Logros
                    <span className="achievements-count">{earned.length}<span style={{ opacity: 0.4 }}>/{allBadges.length}</span></span>
                  </h3>
                  <div className="achievements-grid modern-4x2">
                    {allBadges.map(badge => (
                      <div
                        key={badge.id}
                        className={`achievement-badge ${badge.earned ? 'earned' : 'locked'}`}
                        title={badge.earned ? `✔ ${badge.desc}` : `🔒 Bloqueado: ${badge.desc}`}
                      >
                        <div className={`achievement-icon ${badge.earned ? 'icon-3d' : ''}`} style={badge.earned ? { color: badge.color } : {}}>
                          {badge.icon}
                        </div>
                        <span className="achievement-label">{badge.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* ─── RADAR DE GÉNEROS ───────────────────────────────── */}
            {(() => {
              if (!completedAnime || completedAnime.length === 0) return null;
              const genreCounts = {};
              completedAnime.forEach(entry => {
                if (entry?.media?.genres) {
                  entry.media.genres.forEach(g => {
                    genreCounts[g] = (genreCounts[g] || 0) + 1;
                  });
                }
              });
              const topGenres = Object.entries(genreCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3);
              if (topGenres.length === 0) return null;
              
              const totalTop = topGenres.reduce((acc, [, count]) => acc + count, 0);
              let currentDeg = 0;
              const colors = ['var(--color-anilist-blue)', 'var(--color-accent-purple)', 'var(--color-accent-green)'];
              const conicStops = topGenres.map(([, count], index) => {
                const percentage = (count / totalTop) * 100;
                const start = currentDeg;
                const end = currentDeg + percentage;
                currentDeg += percentage;
                return `${colors[index % colors.length]} ${start}% ${end}%`;
              }).join(', ');

              return (
                <div className="profile-achievements-card">
                  <h3 className="profile-section-title">
                    <PieChart size={16} style={{ color: 'var(--accent)' }} /> Géneros Favoritos
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginTop: '1rem', padding: '0.5rem 0' }}>
                    <div style={{
                      width: '100px', height: '100px', borderRadius: '50%',
                      background: `conic-gradient(${conicStops})`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
                    }}>
                      <div style={{ width: '65px', height: '65px', borderRadius: '50%', background: 'var(--color-bg-light)' }}></div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                      {topGenres.map(([genre, count], index) => (
                        <div key={genre} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: colors[index % colors.length], display: 'inline-block' }}></span>
                          <span style={{ fontWeight: '500', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{genre}</span>
                          <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>{Math.round((count/totalTop)*100)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ─── ACTIVIDAD RECIENTE ───────────────────────────── */}
            {(() => {
              const recent = [...completedAnime]
                .filter(e => e.updatedAt)
                .sort((a, b) => b.updatedAt - a.updatedAt)
                .slice(0, 4);
              if (recent.length === 0) return null;
              const statusLabel = { COMPLETED: 'Completado', CURRENT: 'Viendo', PLANNING: 'Planeado', DROPPED: 'Abandonado', PAUSED: 'Pausado' };
              const statusColor = { COMPLETED: 'var(--color-accent-green)', CURRENT: 'var(--accent)', PLANNING: 'var(--color-text-secondary)', DROPPED: '#ef4444', PAUSED: '#f59e0b' };
              return (
                <div className="profile-activity-card">
                  <h3 className="profile-section-title">
                    <Clock size={16} style={{ color: 'var(--accent)' }} /> Actividad Reciente
                  </h3>
                  <div className="profile-activity-list">
                    {recent.map(entry => (
                      <div key={entry.id} className="profile-activity-item">
                        <img src={entry.media?.coverImage?.large} alt={entry.media?.title?.userPreferred} className="profile-activity-cover" />
                        <div className="profile-activity-info">
                          <p className="profile-activity-title">{entry.media?.title?.userPreferred}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span className="profile-activity-status" style={{ color: statusColor[entry.status] }}>
                              {statusLabel[entry.status] || entry.status}
                            </span>
                            {entry.progress > 0 && (
                              <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>
                                · Ep. {entry.progress}
                              </span>
                            )}
                          </div>
                          {entry.updatedAt && (
                            <p className="profile-activity-date">
                              {new Date(entry.updatedAt * 1000).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                            </p>
                          )}
                        </div>
                        {entry.score > 0 && (
                          <div className="profile-activity-score">
                            <Star size={10} /> {entry.score}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Mobile Settings Modal Overlay */}
            {showSettingsModal && (
              <div className="settings-modal-overlay" onClick={() => setShowSettingsModal(false)}>
                <div className="settings-modal-content card" onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}>
                    <h2 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Palette size={20} style={{ color: 'var(--accent)' }} /> Ajustes
                    </h2>
                    <button onClick={() => setShowSettingsModal(false)} className="settings-modal-close" aria-label="Cerrar ajustes">
                      <X size={20} />
                    </button>
                  </div>
                  
                  <div className="aesthetics-panel" style={{ padding: 0 }}>
                    <div className="aesthetics-section">
                      <span className="aesthetics-label">Color de Acento</span>
                      <div className="color-swatches">
                        {ACCENT_COLORS.map(({ key, color, label }) => (
                          <button
                            key={key}
                            className={`swatch ${accentColor === key ? 'active' : ''}`}
                            style={{ background: color }}
                            onClick={() => setAccentColor(key)}
                            title={label}
                            aria-label={`Color de acento: ${label}`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="aesthetics-section">
                      <span className="aesthetics-label">Estilo de Interfaz</span>
                      <div className="style-mode-toggle">
                        <button className={`style-mode-btn ${styleMode === 'classic' ? 'active' : ''}`} onClick={() => setStyleMode('classic')}>
                          Clásico
                        </button>
                        <button className={`style-mode-btn ${styleMode === 'modern' ? 'active' : ''}`} onClick={() => setStyleMode('modern')}>
                          Moderno
                        </button>
                        <button className={`style-mode-btn ${styleMode === 'modern2' ? 'active' : ''}`} onClick={() => setStyleMode('modern2')}>
                          Moderno 2
                        </button>
                      </div>
                    </div>
                    <div className="aesthetics-section">
                      <span className="aesthetics-label">Marco del Perfil</span>
                      <div className="style-mode-toggle">
                        <button className={`style-mode-btn ${selectedFrame === 'none' ? 'active' : ''}`} onClick={() => handleFrameSelect('none')}>Ninguno</button>
                        <button className={`style-mode-btn ${selectedFrame === 'bronze' ? 'active' : ''}`} disabled={computedLevel < 10} onClick={() => handleFrameSelect('bronze')}>Bronce</button>
                        <button className={`style-mode-btn ${selectedFrame === 'silver' ? 'active' : ''}`} disabled={computedLevel < 30} onClick={() => handleFrameSelect('silver')}>Plata</button>
                        <button className={`style-mode-btn ${selectedFrame === 'gold' ? 'active' : ''}`} disabled={computedLevel < 50} onClick={() => handleFrameSelect('gold')}>Oro</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'settings':
        return (
          <div className="settings-card card" style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Settings size={22} style={{ color: 'var(--accent)' }} /> Ajustes de Estética
              </h2>
            </div>
            
            <div className="aesthetics-panel" style={{ padding: 0 }}>
              <div className="aesthetics-section">
                <span className="aesthetics-label">Color de Acento</span>
                <div className="color-swatches">
                  {ACCENT_COLORS.map(({ key, color, label }) => (
                    <button
                      key={key}
                      className={`swatch ${accentColor === key ? 'active' : ''}`}
                      style={{ background: color }}
                      onClick={() => setAccentColor(key)}
                      title={label}
                      aria-label={`Color de acento: ${label}`}
                    />
                  ))}
                </div>
              </div>

              <div className="aesthetics-section">
                <span className="aesthetics-label">Estilo de Interfaz</span>
                <div className="style-mode-toggle">
                  <button
                    className={`style-mode-btn ${styleMode === 'classic' ? 'active' : ''}`}
                    onClick={() => setStyleMode('classic')}
                  >
                    Clásico
                  </button>
                  <button
                    className={`style-mode-btn ${styleMode === 'modern' ? 'active' : ''}`}
                    onClick={() => setStyleMode('modern')}
                  >
                    Moderno
                  </button>
                  <button
                    className={`style-mode-btn ${styleMode === 'modern2' ? 'active' : ''}`}
                    onClick={() => setStyleMode('modern2')}
                  >
                    Moderno 2
                  </button>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '0.8rem' }}>
                  {styleMode === 'modern'
                    ? '✔️ Modo moderno: glassmorphism + avatar hexagonal.'
                    : styleMode === 'modern2'
                    ? '✔️ Moderno 2: layout 2 columnas, fondos sólidos, sombras neumorfóficas.'
                    : 'Modo clásico: diseño plano y limpio.'}
                </p>
              </div>
              <div className="aesthetics-section">
                <span className="aesthetics-label">Marco del Perfil</span>
                <div className="style-mode-toggle">
                  <button className={`style-mode-btn ${selectedFrame === 'none' ? 'active' : ''}`} onClick={() => handleFrameSelect('none')}>Ninguno</button>
                  <button className={`style-mode-btn ${selectedFrame === 'bronze' ? 'active' : ''}`} disabled={computedLevel < 10} onClick={() => handleFrameSelect('bronze')}>Bronce</button>
                  <button className={`style-mode-btn ${selectedFrame === 'silver' ? 'active' : ''}`} disabled={computedLevel < 30} onClick={() => handleFrameSelect('silver')}>Plata</button>
                  <button className={`style-mode-btn ${selectedFrame === 'gold' ? 'active' : ''}`} disabled={computedLevel < 50} onClick={() => handleFrameSelect('gold')}>Oro</button>
                </div>
              </div>
            </div>
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
                        {anime.mediaListEntry && (
                          <div className={`search-list-status-badge ${anime.mediaListEntry.status === 'COMPLETED' ? 'completed' : 'in-progress'}`}>
                            {anime.mediaListEntry.status === 'COMPLETED' 
                              ? `Visto: ${anime.mediaListEntry.progress}/${anime.episodes || anime.mediaListEntry.progress} eps` 
                              : `Visto: ${anime.mediaListEntry.progress}/${anime.episodes || '?'} eps`
                            }
                          </div>
                        )}
                      </div>
                      <div className="anime-info">
                        <span className="anime-title" title={anime.title?.userPreferred}>
                          {anime.title?.userPreferred}
                        </span>
                        <div className="anime-meta">
                          <span>{anime.format || 'ANIME'}</span>
                          <span>{anime.episodes ? `${anime.episodes} eps` : '?' }</span>
                        </div>
                        {anime.mediaListEntry && (
                          <div className={`search-list-status-badge-list ${anime.mediaListEntry.status === 'COMPLETED' ? 'completed' : 'in-progress'}`}>
                            {anime.mediaListEntry.status === 'COMPLETED' 
                              ? `Visto: ${anime.mediaListEntry.progress}/${anime.episodes || anime.mediaListEntry.progress} eps` 
                              : `Visto: ${anime.mediaListEntry.progress}/${anime.episodes || '?'} eps`
                            }
                          </div>
                        )}
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
                {anilistFriends.length} {anilistFriends.length === 1 ? 'miembro' : 'miembros'}
              </span>
            </div>

            {/* AMIGOS */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Mis Amigos</h3>
                <button 
                  className="btn-secondary" 
                  onClick={() => fetchAnilistFollowing()}
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Users size={14} /> Actualizar Lista
                </button>
              </div>
              {(() => {
                if (anilistFriends.length === 0) {
                  return (
                    <div style={{ background: 'var(--color-bg-light)', padding: '2rem', borderRadius: '12px', textAlign: 'center' }}>
                      <Users size={40} style={{ color: 'var(--color-text-secondary)', opacity: 0.5, marginBottom: '1rem' }} />
                      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>Aún no sigues a nadie en AniList.</p>
                      <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Usa el buscador de abajo para encontrar usuarios y ver sus perfiles.</p>
                    </div>
                  );
                }

                return (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '1rem' }}>
                    {anilistFriends.map(friend => (
                      <div 
                        key={friend.name} 
                        onClick={() => handleNavigateToFriend(friend.name)} 
                        style={{ background: 'var(--color-bg-light)', borderRadius: '12px', padding: '1rem', textAlign: 'center', cursor: 'pointer', border: '1px solid var(--border-glass)' }} 
                        className="card"
                      >
                        <img src={friend.avatar?.large || friend.avatar || 'https://anilist.co/img/icons/icon.svg'} alt={friend.name} style={{ width: '60px', height: '60px', borderRadius: '50%', marginBottom: '0.75rem', objectFit: 'cover' }} />
                        <p style={{ fontWeight: '600', margin: 0, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{friend.name}</p>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Buscador de amigos */}
            <form onSubmit={(e) => { e.preventDefault(); if (friendSearchQuery.trim()) { handleNavigateToFriend(friendSearchQuery.trim()); setFriendSearchQuery(''); } }} className="friend-add-form">
              <label className="friend-add-label">
                Buscar Perfil (Usuario de AniList)
              </label>
              <div className="friend-add-row" style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={friendSearchQuery}
                  onChange={(e) => setFriendSearchQuery(e.target.value)}
                  placeholder="Ej: Rozas22, iker_..."
                  className="friend-search-input"
                  style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
                />
                <button type="submit" className="btn-primary" disabled={!friendSearchQuery.trim()} style={{ padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Search size={18} />
                  Buscar
                </button>
              </div>
            </form>
          </div>
        );
      case 'analytics': {
        const totalEntries = completedAnime.length;
        if (totalEntries === 0) {
          return (
            <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <BarChart2 size={48} style={{ color: 'var(--color-anilist-blue)', opacity: 0.5, marginBottom: '1rem' }} />
              <h3>Sin datos todavía</h3>
              <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
                Añade animes a tu lista para ver tu análisis.
              </p>
            </div>
          );
        }

        const allGenres = completedAnime.flatMap(e => e.media?.genres || []);
        const allStudios = completedAnime.flatMap(e =>
          (e.media?.studios?.nodes || []).map(s => s.name)
        );
        const allFormats = completedAnime.map(e => e.media?.format).filter(Boolean);
        const allScores = completedAnime.map(e => e.score).filter(s => s > 0);

        const topGenres = topN(allGenres, 8);
        const topStudios = topN(allStudios, 6);
        const formatDist = topN(allFormats, 8);

        const statusCounts = {
          COMPLETED: completedAnime.filter(e => e.status === 'COMPLETED').length,
          CURRENT: completedAnime.filter(e => e.status === 'CURRENT').length,
          PLANNING: completedAnime.filter(e => e.status === 'PLANNING').length,
          DROPPED: completedAnime.filter(e => e.status === 'DROPPED').length,
          PAUSED: completedAnime.filter(e => e.status === 'PAUSED').length,
        };

        const avgScore = allScores.length > 0
          ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1)
          : 'N/A';
        const totalEpisodesA = completedAnime.reduce((sum, e) => sum + (e.progress || 0), 0);
        const totalHoursA = Math.round(
          completedAnime.reduce((sum, e) => sum + (e.progress || 0) * (e.media?.duration || 24), 0) / 60
        );
        const maxGenreCount = topGenres[0]?.[1] || 1;
        const maxStudioCount = topStudios[0]?.[1] || 1;

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
              <BarChart2 size={24} style={{ color: 'var(--color-anilist-blue)' }} />
              <h2 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)' }}>Análisis de tu Lista</h2>
            </div>

            <div className="stats-grid analytics-stats-grid">
              <div className="stat-item analytics-stat-item">
                <div className="analytics-stat-icon" style={{ color: 'var(--accent)' }}>
                  <Tv size={26} />
                </div>
                <div className="analytics-stat-body">
                  <div className="stat-value">{totalEntries}</div>
                  <div className="stat-label">Animes en Lista</div>
                </div>
              </div>
              <div className="stat-item analytics-stat-item">
                <div className="analytics-stat-icon" style={{ color: 'var(--color-accent-green)' }}>
                  <TrendingUp size={26} />
                </div>
                <div className="analytics-stat-body">
                  <div className="stat-value">{totalEpisodesA}</div>
                  <div className="stat-label">Episodios Vistos</div>
                </div>
              </div>
              <div className="stat-item analytics-stat-item">
                <div className="analytics-stat-icon" style={{ color: 'var(--color-accent-purple)' }}>
                  <Clock size={26} />
                </div>
                <div className="analytics-stat-body">
                  <div className="stat-value">{totalHoursA}h</div>
                  <div className="stat-label">Horas Invertidas</div>
                </div>
              </div>
              <div className="stat-item analytics-stat-item">
                <div className="analytics-stat-icon" style={{ color: '#f59e0b' }}>
                  <Star size={26} />
                </div>
                <div className="analytics-stat-body">
                  <div className="stat-value">{avgScore}</div>
                  <div className="stat-label">Puntuación Media</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>

              {topGenres.length > 0 && (
                <div className="card" style={{ padding: '1.5rem' }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Award size={16} style={{ color: 'var(--color-accent-purple)' }} /> Géneros Favoritos
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {topGenres.map(([genre, count], i) => (
                      <div key={genre}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.875rem' }}>
                          <span style={{ color: i === 0 ? 'var(--color-anilist-blue)' : 'var(--color-text-primary)', fontWeight: i < 3 ? '600' : '400' }}>{genre}</span>
                          <span style={{ color: 'var(--color-text-secondary)' }}>{count}</span>
                        </div>
                        <div className="analytics-bar-track">
                          <div className="analytics-bar-fill" style={{ width: `${(count / maxGenreCount) * 100}%`, background: i === 0 ? 'var(--color-anilist-blue)' : i < 3 ? 'var(--color-accent-purple)' : 'rgba(255,255,255,0.15)' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {topStudios.length > 0 && (
                <div className="card" style={{ padding: '1.5rem' }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Award size={16} style={{ color: 'var(--color-accent-green)' }} /> Estudios Más Vistos
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {topStudios.map(([studio, count], i) => (
                      <div key={studio}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.875rem' }}>
                          <span style={{ color: i === 0 ? 'var(--color-accent-green)' : 'var(--color-text-primary)', fontWeight: i < 3 ? '600' : '400' }}>{studio}</span>
                          <span style={{ color: 'var(--color-text-secondary)' }}>{count}</span>
                        </div>
                        <div className="analytics-bar-track">
                          <div className="analytics-bar-fill" style={{ width: `${(count / maxStudioCount) * 100}%`, background: i === 0 ? 'var(--color-accent-green)' : i < 3 ? '#34d399' : 'rgba(255,255,255,0.15)' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <List size={16} style={{ color: '#f59e0b' }} /> Estado de la Lista
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {[
                    ['COMPLETED', 'Completados', 'var(--color-accent-green)'],
                    ['CURRENT', 'Viendo', 'var(--color-anilist-blue)'],
                    ['PLANNING', 'Planeo Ver', 'var(--color-accent-purple)'],
                    ['PAUSED', 'En Pausa', '#f59e0b'],
                    ['DROPPED', 'Abandonados', 'var(--color-accent-red)']
                  ].filter(([key]) => statusCounts[key] > 0)
                    .map(([key, label, color]) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: '0.875rem' }}>{label}</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: '600', color }}>{statusCounts[key]}</span>
                    </div>
                  ))}
                </div>
              </div>

              {formatDist.length > 0 && (
                <div className="card" style={{ padding: '1.5rem' }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Tv size={16} style={{ color: 'var(--color-anilist-blue)' }} /> Formato
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {formatDist.map(([fmt, count]) => (
                      <div key={fmt} style={{ padding: '0.4rem 0.75rem', background: 'rgba(61,180,242,0.1)', border: '1px solid rgba(61,180,242,0.2)', borderRadius: '20px', fontSize: '0.8rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <span style={{ color: 'var(--color-anilist-blue)', fontWeight: '600' }}>{fmt}</span>
                        <span style={{ color: 'var(--color-text-secondary)' }}>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  // ── Analytics helper: compute top-N from a flat list of values ──
  const topN = (items, n = 5) => {
    const freq = {};
    items.forEach(v => { if (v) freq[v] = (freq[v] || 0) + 1; });
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n);
  };

  // If callback route, render Callback component
  if (isCallback) {
    return (
      <div className="app-container">
        <header>
          <div className="logo-container" style={{ padding: '0.25rem 0' }}>
            <img src="/logo.png" alt="AnimeTracker" style={{ width: '130px', objectFit: 'contain' }} />
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
            <img src="/logo.png" alt="AnimeTracker" style={{ height: '36px', objectFit: 'contain' }} />
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
      {/* Notification Center Dropdown */}
      {showNotificationCenter && (
        <div className="notification-dropdown card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexShrink: 0 }}>
            <h2 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bell size={18} style={{ color: 'var(--accent)' }} /> Notificaciones
            </h2>
            <button onClick={() => setShowNotificationCenter(false)} className="settings-modal-close" aria-label="Cerrar notificaciones">
              <X size={18} />
            </button>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <button 
              onClick={() => setNotificationTab('episodes')}
              style={{ background: 'transparent', border: 'none', padding: '0.5rem 0', color: notificationTab === 'episodes' ? 'var(--accent)' : 'var(--color-text-secondary)', fontWeight: notificationTab === 'episodes' ? '600' : '400', borderBottom: notificationTab === 'episodes' ? '2px solid var(--accent)' : '2px solid transparent', cursor: 'pointer', flex: 1 }}
            >
              Noticias
            </button>
            <button 
              onClick={() => setNotificationTab('social')}
              style={{ background: 'transparent', border: 'none', padding: '0.5rem 0', color: notificationTab === 'social' ? 'var(--accent)' : 'var(--color-text-secondary)', fontWeight: notificationTab === 'social' ? '600' : '400', borderBottom: notificationTab === 'social' ? '2px solid var(--accent)' : '2px solid transparent', cursor: 'pointer', flex: 1, position: 'relative' }}
            >
              Social
              {socialNotifications.filter(n => !n.isRead).length > 0 && (
                <span style={{ position: 'absolute', top: '2px', right: '10px', background: 'var(--color-accent-red)', width: '6px', height: '6px', borderRadius: '50%' }}></span>
              )}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', flex: 1, paddingRight: '0.25rem' }}>
            {notificationTab === 'episodes' ? (
              <>
                {episodeNotifications.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--color-text-secondary)' }}>
                    <Bell size={32} style={{ opacity: 0.2, marginBottom: '0.5rem' }} />
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>Todo al día en tus animes</p>
                  </div>
                ) : (
                  episodeNotifications.map(notif => (
                    <div key={notif.id} style={{ display: 'flex', gap: '0.75rem', padding: '0.75rem', background: 'var(--color-bg-light)', borderRadius: '12px', alignItems: 'flex-start', position: 'relative' }}>
                      <img src={notif.anime.coverImage?.large} alt="cover" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', border: notif.isRead ? 'none' : '2px solid var(--accent)' }} />
                      <div style={{ flex: 1, paddingRight: '1.25rem' }}>
                        <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', fontWeight: '500', lineHeight: 1.2 }}>{notif.anime.title.userPreferred}</p>
                        <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>
                          {notif.timeText}
                        </p>
                        <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: 'var(--accent)' }}>
                          {notif.unseenCount} ep. nuevo(s) (hasta el {notif.latestAvailable})
                        </p>
                        <button 
                          onClick={() => { 
                            markEpisodeNotificationAsRead(notif.id);
                            setShowNotificationCenter(false); 
                            handleTabClick('mylist'); 
                            setMylistSubTab('CURRENT'); 
                          }} 
                          className="btn-primary" 
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', width: '100%' }}
                        >
                          Ver ahora
                        </button>
                      </div>
                      <button 
                        onClick={() => dismissEpisodeNotification(notif.id)} 
                        style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', padding: '0.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                        aria-label="Descartar"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))
                )}
              </>
            ) : (
              <>
                {socialNotifications.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--color-text-secondary)' }}>
                    <Users size={32} style={{ opacity: 0.2, marginBottom: '0.5rem' }} />
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>No hay actividad social reciente</p>
                  </div>
                ) : (
                  socialNotifications.map(notif => (
                    <div key={notif.id} style={{ display: 'flex', gap: '0.75rem', padding: '0.75rem', background: 'var(--color-bg-light)', borderRadius: '12px', alignItems: 'center', position: 'relative' }}>
                      <img src={notif.user?.avatar?.large || 'https://anilist.co/img/icons/icon.svg'} alt="avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: notif.isRead ? 'none' : '2px solid var(--accent)' }} />
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', lineHeight: 1.2 }}>
                          <span style={{ fontWeight: 'bold' }}>{notif.user?.name}</span> te ha empezado a seguir.
                        </p>
                        <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>
                          {new Date(notif.createdAt * 1000).toLocaleDateString()}
                        </p>
                      </div>
                      <button onClick={() => dismissSocialNotification(notif.id)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', padding: '0.2rem' }} aria-label="Descartar">
                        <X size={16} />
                      </button>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* SIDEBAR FOR DESKTOP */}
      <aside className="sidebar">
        <div className="sidebar-logo" style={{ padding: '1rem 1.25rem 0.5rem' }}>
          <img
            src="/logo.png"
            alt="AnimeTracker"
            style={{ width: '150px', objectFit: 'contain', display: 'block' }}
          />
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
          </button>

          <button 
            className={`sidebar-nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => handleTabClick('analytics')}
          >
            <BarChart2 size={18} />
            <span>Análisis</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <img 
              src={userData.avatar?.large || 'https://anilist.co/img/icons/icon.svg'} 
              alt={userData.name} 
              className={`sidebar-avatar ${selectedFrame !== 'none' ? `frame-${selectedFrame}` : ''}`}
            />
            <div className="sidebar-user-meta">
              <span className="sidebar-username">{userData.name}</span>
            </div>
            <button
              onClick={handleOpenNotificationCenter}
              className="settings-gear-btn"
              title="Notificaciones"
              style={{ position: 'relative' }}
            >
              <Bell size={18} />
              {(episodeNotifications.filter(n => !n.isRead).length + socialNotifications.filter(n => !n.isRead).length) > 0 && (
                <span style={{ position: 'absolute', top: -2, right: -2, background: 'var(--color-accent-purple)', color: 'white', borderRadius: '50%', width: '16px', height: '16px', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {episodeNotifications.filter(n => !n.isRead).length + socialNotifications.filter(n => !n.isRead).length}
                </span>
              )}
            </button>
            <button
              onClick={() => handleTabClick('settings')}
              className="settings-gear-btn"
              title="Ajustes de Estética"
            >
              <Settings size={18} />
            </button>
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
          <div className="logo-container" style={{ padding: '0.1rem 0' }}>
            <img src="/logo.png" alt="AnimeTracker" style={{ width: '120px', objectFit: 'contain' }} />
          </div>
          <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="settings-gear-btn"
              title="Ajustes de Estética"
            >
              <Settings size={20} />
            </button>
            <button
              onClick={toggleNotificationCenter}
              className="settings-gear-btn"
              title="Notificaciones"
              style={{ position: 'relative' }}
            >
              <Bell size={20} />
              {(episodeNotifications.filter(n => !n.isRead).length + socialNotifications.filter(n => !n.isRead).length) > 0 && (
                <span style={{ position: 'absolute', top: -2, right: -2, background: 'var(--color-accent-purple)', color: 'white', borderRadius: '50%', width: '16px', height: '16px', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {episodeNotifications.filter(n => !n.isRead).length + socialNotifications.filter(n => !n.isRead).length}
                </span>
              )}
            </button>
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
          </button>

          <button
            className={`bottom-nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => handleTabClick('analytics')}
          >
            <BarChart2 size={20} />
            <span>Análisis</span>
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
                      {translatingDesc ? (
                        <p className="synopsis-loading">
                          <span className="loader" style={{ width: 12, height: 12, borderWidth: 2 }} />
                          Traduciendo...
                        </p>
                      ) : translatedDescription ? (
                        <p className="detail-description">{translatedDescription}</p>
                      ) : (
                        <div
                          className="detail-description"
                          dangerouslySetInnerHTML={{ __html: selectedAnime.description }}
                        />
                      )}
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
        <div className="update-banner">
          <span className="update-banner-text">
            🚀 Nueva versión disponible
          </span>
          <button
            className="update-banner-btn"
            onClick={handleUpdateApp}
          >
            Actualizar ahora
          </button>
          <button
            className="update-banner-dismiss"
            onClick={() => setShowUpdateBanner(false)}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
      )}

      {/* Level Up Modal */}
      {showLevelUpModal && levelUpData && (
        <div className="modal-overlay" onClick={() => setShowLevelUpModal(false)} style={{ zIndex: 9998 }}>
          <div className="modal-content card" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center', maxWidth: '400px' }}>
            <h2 style={{ color: 'var(--accent)', marginBottom: '1rem', fontSize: '2rem' }}>¡Nivel Alcanzado!</h2>
            <Award size={64} style={{ color: 'var(--accent)', marginBottom: '1rem', margin: '0 auto' }} />
            <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
              ¡Felicidades <strong>{userData?.name}</strong>! Has alcanzado el Nivel {levelUpData.level}.
            </p>
            <p style={{ fontSize: '1.1rem', color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
              Rango actual: <strong style={{ color: 'var(--accent)' }}>{levelUpData.title}</strong>
            </p>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
              Llevas un total de {levelUpData.totalEps} episodios vistos.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn-secondary" onClick={() => { setShowLevelUpModal(false); handleTabClick('profile'); }} style={{ flex: 1, fontSize: '1rem', padding: '0.8rem' }}>
                Ver Trofeos
              </button>
              <button className="btn-primary" onClick={() => setShowLevelUpModal(false)} style={{ flex: 1, fontSize: '1rem', padding: '0.8rem' }}>
                ¡Increíble!
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Interactive Trophy Modal */}
      <AnimatePresence>
        {selectedTrophy && (
          <motion.div 
            className="trophy-modal-overlay" 
            onClick={() => setSelectedTrophy(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="trophy-modal-content card"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.8, y: 50, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, y: 50, opacity: 0 }}
            >
              <button className="settings-modal-close" onClick={() => setSelectedTrophy(null)} style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
                <X size={20} />
              </button>

              <div className={`trophy-modal-icon ${!selectedTrophy.isUnlocked ? 'locked' : ''} ${selectedTrophy.frameName ? `frame-${selectedTrophy.frameName}` : ''}`}>
                {!selectedTrophy.isUnlocked ? <Lock size={48} /> : <Award size={48} />}
              </div>

              <h2 className="trophy-modal-title">{selectedTrophy.title}</h2>
              
              <div className="trophy-modal-status">
                {selectedTrophy.isUnlocked ? (
                  <span style={{ color: 'var(--accent)' }}>¡Desbloqueado!</span>
                ) : (
                  <span style={{ color: 'var(--color-text-secondary)' }}>Bloqueado: Alcanza el Nivel {selectedTrophy.level}</span>
                )}
              </div>

              {selectedTrophy.frameName && (
                <div className="trophy-modal-reward">
                  <p>Recompensa: <strong>{selectedTrophy.frameLabel}</strong></p>
                  {selectedTrophy.isUnlocked && (
                    <button 
                      className="btn-primary" 
                      style={{ marginTop: '1rem', width: '100%' }}
                      onClick={() => {
                        handleFrameSelect(selectedTrophy.frameName);
                        setSelectedTrophy(null);
                      }}
                    >
                      Equipar Marco
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
