import sys

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Imports
imports = """import ArenaView from './components/ArenaView';
import { supabase } from './supabase';
import { calculatePL, getLeagueInfo } from './leagueUtils';
"""
if "import { supabase }" not in code:
    code = code.replace("import Callback from './components/Callback';", imports + "import Callback from './components/Callback';")

# 2. Add Swords
if "Swords" not in code:
    code = code.replace("from 'lucide-react';", ", Swords } from 'lucide-react';")
    code = code.replace("} , Swords", ", Swords") # In case it was added weirdly

# 3. Compute userLeague
compute_league = """
  const userLeague = userData ? getLeagueInfo(calculatePL(userData.statistics?.anime?.episodesWatched || 0, quizPoints)) : null;
"""
target_compute = "const computedLevel = userData ? calculateLevelStats(userData.statistics?.anime?.episodesWatched || 0).computedLevel : 0;"
if "const userLeague" not in code and target_compute in code:
    code = code.replace(target_compute, target_compute + compute_league)

# 4. Pass userLeague
if "userLeague={userLeague}" not in code:
    code = code.replace("selectedFrame={selectedFrame}", "selectedFrame={selectedFrame}\n            userLeague={userLeague}")

# 5. Sidebar
target_sidebar = """            <button 
              className={`nav-btn ${activeTab === 'group' ? 'active' : ''}`}
              onClick={() => { setActiveTab('group'); if(isMobile) setShowMobileMenu(false); }}
            >
              <Users size={20} />
              Amigos
            </button>"""
sidebar_nav = """
            <button 
              className={`nav-btn ${activeTab === 'arena' ? 'active' : ''}`}
              onClick={() => { setActiveTab('arena'); if(isMobile) setShowMobileMenu(false); }}
            >
              <Swords size={20} />
              Arena
            </button>"""
if "activeTab === 'arena'" not in code and target_sidebar in code:
    code = code.replace(target_sidebar, target_sidebar + sidebar_nav)

# 6. Bottom nav
target_bottom = """          <button className={`bottom-nav-btn ${activeTab === 'group' ? 'active' : ''}`} onClick={() => setActiveTab('group')}>
            <Users size={20} />
            <span>Amigos</span>
          </button>"""
bottom_nav = """
          <button className={`bottom-nav-btn ${activeTab === 'arena' ? 'active' : ''}`} onClick={() => setActiveTab('arena')}>
            <Swords size={20} />
            <span>Arena</span>
          </button>"""
if "<span>Arena</span>" not in code and target_bottom in code:
    code = code.replace(target_bottom, target_bottom + bottom_nav)

# 7. Render view
target_case = "case 'settings':"
arena_case = """      case 'arena':
        return <ArenaView user={userData} anilistFriends={anilistFriends} />;
"""
if "case 'arena':" not in code and target_case in code:
    code = code.replace(target_case, arena_case + "\n      " + target_case)

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Arena completely restored!")