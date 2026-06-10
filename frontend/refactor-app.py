import sys
import re

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update import
code = code.replace("import { calculatePL, getLeagueInfo } from './leagueUtils';", "import { calculatePL, getLeagueInfo, calculateLevel } from './leagueUtils';")

# 2. Remove old calculateLevelStats and getEpsForNextLevel definitions
pattern = r"const getEpsForNextLevel = \(level\) => \{.*?const getHighestFrame = \(level\) => \{"
code = re.sub(pattern, "const getHighestFrame = (level) => {", code, flags=re.DOTALL)

# 3. Replace all calculateLevelStats with calculateLevel
code = code.replace("calculateLevelStats", "calculateLevel")

# 4. Modify fetchFriendProfile to get level from Supabase
target_fetch = """        const user = result.data.User;
        setFriendData(user);"""

replacement_fetch = """        const user = result.data.User;
        
        // Fetch level from Supabase
        try {
          const { data: supaData, error: supaErr } = await supabase
            .from('users')
            .select('level')
            .eq('anilist_id', user.id.toString())
            .single();
            
          if (!supaErr && supaData && supaData.level) {
            user.supabaseLevel = supaData.level;
          }
        } catch (e) {
          console.error("Error fetching friend level from Supabase", e);
        }

        setFriendData(user);"""

code = code.replace(target_fetch, replacement_fetch)

# 5. Modify ProfileHeader to use supabaseLevel if available
target_header = """  const totalEps = user.statistics?.anime?.episodesWatched || 0;
  const stats = calculateLevel(totalEps);"""

replacement_header = """  const totalEps = user.statistics?.anime?.episodesWatched || 0;
  const stats = calculateLevel(totalEps);
  
  if (user.supabaseLevel) {
    stats.computedLevel = Math.max(1, user.supabaseLevel);
    // Keep userTitle relative to episodes or recalculate title based on level
    if (stats.computedLevel >= 61) stats.userTitle = 'Leyenda';
    else if (stats.computedLevel >= 31) stats.userTitle = 'Veterano';
    else if (stats.computedLevel >= 11) stats.userTitle = 'Aprendiz';
    else stats.userTitle = 'Novato';
  }"""

code = code.replace(target_header, replacement_header)

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("App.jsx refactored!")