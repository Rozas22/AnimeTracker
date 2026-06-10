import sys

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

target1 = """  const getInitialRouteInfo = () => {
    const path = window.location.pathname;
    if (path.startsWith('/profile/')) {
      return { tab: 'friend-profile', username: decodeURIComponent(path.split('/')[2]) };
    }
    return { tab: 'profile', username: null };
  };"""

replacement1 = """  const getInitialRouteInfo = () => {
    const path = window.location.pathname;
    if (path.startsWith('/profile/')) {
      return { tab: 'friend-profile', username: decodeURIComponent(path.split('/')[2]) };
    }
    if (path.startsWith('/lista/')) {
      return { tab: 'mylist', username: decodeURIComponent(path.split('/')[2]) };
    }
    if (path === '/lista') {
      return { tab: 'mylist', username: null };
    }
    return { tab: 'profile', username: null };
  };"""

code = code.replace(target1, replacement1)

target2 = """  const handleTabClick = (tabName) => {
    setActiveTab(tabName);
    window.history.pushState(null, '', '/');
  };"""

replacement2 = """  const handleTabClick = (tabName, username = null) => {
    setActiveTab(tabName);
    if (username) {
      setViewedFriendUsername(username);
    }
    
    if (tabName === 'mylist') {
        window.history.pushState(null, '', username ? `/lista/${username}` : '/lista');
    } else if (tabName === 'friend-profile' && username) {
        window.history.pushState(null, '', `/profile/${username}`);
    } else {
        window.history.pushState(null, '', '/');
        if (tabName !== 'friend-profile' && tabName !== 'mylist') {
            setViewedFriendUsername(null);
        }
    }
  };"""

code = code.replace(target2, replacement2)

target3 = """    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.startsWith('/profile/')) {
        const username = decodeURIComponent(path.split('/')[2]);
        setActiveTab('friend-profile');
        setViewedFriendUsername(username);
      } else if (path === '/callback') {
        // Callback logic is handled by initial state
      } else {
        setActiveTab('profile');
      }
    };"""

replacement3 = """    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.startsWith('/profile/')) {
        const username = decodeURIComponent(path.split('/')[2]);
        setActiveTab('friend-profile');
        setViewedFriendUsername(username);
      } else if (path.startsWith('/lista/')) {
        const username = decodeURIComponent(path.split('/')[2]);
        setActiveTab('mylist');
        setViewedFriendUsername(username);
      } else if (path === '/lista') {
        setActiveTab('mylist');
        setViewedFriendUsername(null);
      } else if (path === '/callback') {
        // Callback logic is handled by initial state
      } else {
        setActiveTab('profile');
        setViewedFriendUsername(null);
      }
    };"""

code = code.replace(target3, replacement3)

target4 = """  useEffect(() => {
    if (activeTab === 'friend-profile' && viewedFriendUsername) {
      fetchFriendProfile(viewedFriendUsername);
    }
  }, [activeTab, viewedFriendUsername]);"""

replacement4 = """  useEffect(() => {
    if ((activeTab === 'friend-profile' || activeTab === 'mylist') && viewedFriendUsername) {
      fetchFriendProfile(viewedFriendUsername);
    }
  }, [activeTab, viewedFriendUsername]);"""

code = code.replace(target4, replacement4)

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Routing infrastructure updated!")