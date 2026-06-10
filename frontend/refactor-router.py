import sys

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update getInitialRouteInfo to handle /lista/:id
target_initial_route = """  const getInitialRouteInfo = () => {
    const path = window.location.pathname;
    if (path.startsWith('/profile/')) {
      const username = path.substring('/profile/'.length);
      return { tab: 'friend-profile', username };
    }
    return { tab: 'profile', username: null };
  };"""

replacement_initial_route = """  const getInitialRouteInfo = () => {
    const path = window.location.pathname;
    if (path.startsWith('/profile/')) {
      const username = path.substring('/profile/'.length);
      return { tab: 'friend-profile', username };
    }
    if (path.startsWith('/lista/')) {
      const identifier = path.substring('/lista/'.length);
      return { tab: 'mylist', username: identifier }; // We use username field to store either id or username
    }
    return { tab: 'profile', username: null };
  };"""

code = code.replace(target_initial_route, replacement_initial_route)

# 2. Update fetchFriendProfile to handle both ID and Username
target_fetch_friend = """  const fetchFriendProfile = async (username) => {
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
          avatar { large }
          bannerImage
          statistics {
            anime {
              episodesWatched
              count
              meanScore
            }
          }
        }
      }
    `;

    try {
      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { name: username } })
      });"""

replacement_fetch_friend = """  const fetchFriendProfile = async (identifier) => {
    if (!identifier) return;
    setFriendLoading(true);
    setFriendError('');
    setFriendData(null);
    setFriendAnimeList([]);

    // Failsafe timeout to prevent infinite loading state
    const timeoutId = setTimeout(() => {
      setFriendLoading(false);
      setFriendError('Tiempo de espera agotado al cargar el perfil.');
    }, 15000);

    const isId = !isNaN(identifier) && Number.isInteger(parseFloat(identifier));
    
    const query = isId ? `
      query ($id: Int) {
        User (id: $id) {
          id
          name
          avatar { large }
          bannerImage
          statistics {
            anime {
              episodesWatched
              count
              meanScore
            }
          }
        }
      }
    ` : `
      query ($name: String) {
        User (name: $name) {
          id
          name
          avatar { large }
          bannerImage
          statistics {
            anime {
              episodesWatched
              count
              meanScore
            }
          }
        }
      }
    `;

    const variables = isId ? { id: parseInt(identifier, 10) } : { name: identifier };

    try {
      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables })
      });"""

code = code.replace(target_fetch_friend, replacement_fetch_friend)

# 3. Update Animes Vistos link to pass ID
target_stats_button = """                <div className="stat-item clickable" onClick={() => { onTabClick('mylist', isOwnProfile ? null : user.name); onSubTabClick('COMPLETED'); }} style={{ cursor: 'pointer' }}>"""
replacement_stats_button = """                <div className="stat-item clickable" onClick={() => { onTabClick('mylist', isOwnProfile ? null : user.id); onSubTabClick('COMPLETED'); }} style={{ cursor: 'pointer' }}>"""
code = code.replace(target_stats_button, replacement_stats_button)

# 4. Update window.history pushing to handle ID
target_history = """    if (tabName === 'mylist') {
        window.history.pushState(null, '', username ? `/lista/${username}` : '/lista');
    } else if (tabName === 'friend-profile' && username) {"""
replacement_history = """    if (tabName === 'mylist') {
        window.history.pushState(null, '', username ? `/lista/${username}` : '/mi-lista');
    } else if (tabName === 'friend-profile' && username) {"""
code = code.replace(target_history, replacement_history)

# 5. Fix mylist case to conditionally use friend data
target_mylist = """        case 'mylist': {
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
                </div>"""

replacement_mylist = """        case 'mylist': {
          const isFriendList = !!viewedFriendUsername;
          const userAnimeList = isFriendList ? friendAnimeList : completedAnime;
          const filteredList = userAnimeList.filter(entry => entry.status === mylistSubTab);
          const groupedList = groupCompletedAnimeByFranchise(filteredList);
          const listTitle = isFriendList ? `Lista de ${friendData?.name || 'Amigo'}` : "Mi Lista de Anime";
          const listSubtitle = isFriendList ? `Explorando el catálogo de anime.` : "Administra tus series en emisión, completadas y planeadas.";
          
          return (
            <div className="card mylist-card">
              {/* Header with Title, View Mode toggle and Back to Profile button */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', marginBottom: '0.25rem' }}>{listTitle}</h2>
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                    {listSubtitle}
                  </p>
                </div>"""
code = code.replace(target_mylist, replacement_mylist)

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Router dynamics modified!")