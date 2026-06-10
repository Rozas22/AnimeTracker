import sys

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

target = """      case 'mylist': {
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

replacement = """      case 'mylist': {
        const isFriendList = Boolean(viewedFriendUsername);
        
        if (isFriendList && friendLoading) {
          return (
            <div style={{ textAlign: 'center', padding: '4rem' }}>
              <div className="loader"></div>
              <p style={{ color: 'var(--color-text-secondary)', marginTop: '1rem' }}>Cargando lista de {viewedFriendUsername}...</p>
            </div>
          );
        }

        const userAnimeList = isFriendList ? (friendAnimeList || []) : completedAnime;
        const listOwnerName = isFriendList ? (friendData?.name || viewedFriendUsername) : 'Mi';
        const filteredList = userAnimeList.filter(entry => entry.status === mylistSubTab);
        const groupedList = groupCompletedAnimeByFranchise(filteredList);
        
        return (
          <div className="card mylist-card">
            {/* Header with Title, View Mode toggle and Back to Profile button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', marginBottom: '0.25rem' }}>{isFriendList ? `Lista de ${listOwnerName}` : 'Mi Lista de Anime'}</h2>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                  {isFriendList ? `Series de ${listOwnerName}` : 'Administra tus series en emisión, completadas y planeadas.'}
                </p>
              </div>"""

code = code.replace(target, replacement)

target_back_btn = """                <button 
                  className="btn-secondary" 
                  onClick={() => handleTabClick('profile')}
                  style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                >
                  Volver al Perfil
                </button>"""

replacement_back_btn = """                <button 
                  className="btn-secondary" 
                  onClick={() => handleTabClick(isFriendList ? 'friend-profile' : 'profile', viewedFriendUsername)}
                  style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                >
                  Volver al Perfil
                </button>"""

code = code.replace(target_back_btn, replacement_back_btn)

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("mylist logic refactored for friends!")