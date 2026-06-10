import sys

with open('src/components/ArenaView.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

target_friends = """        // Add friends (We assume we don't have their exact episodesWatched dynamically unless we fetched it. 
        // Wait, anilistFriends from GraphQL usually just has id, name, avatar. 
        // For the sake of the leaderboard without making 50 GraphQL requests, we will use a simulated episode count 
        // based on their ID if we don't have it, or ideally we should fetch it. 
        // Since we didn't fetch it, we'll randomize slightly based on their ID for the demo, 
        // OR we just use quiz points + 5000 as base.
        // In a real app we'd fetch their stats, but AniList doesn't return statistics in the `following` query.
        
        anilistFriends?.forEach(friend => {
            // Simulated episodes for friends since AniList doesn't give stats in the basic query
            // We use a deterministic pseudo-random based on ID so it doesn't change on refresh
            const simulatedEps = (friend.id % 5000) + 1000; 
            players.push({
                id: friend.id,
                name: friend.name,
                avatar: friend.avatar?.large,
                isMe: false,
                level: calculateLevel(friend.statistics?.anime?.episodesWatched || 0).computedLevel,
                pl: calculatePL(simulatedEps, quizPointsMap[friend.id] || 0)
            });
        });"""

replacement_friends = """        // Add friends using their real stats from AniList + quiz points from Supabase
        anilistFriends?.forEach(friend => {
            const realEps = friend.statistics?.anime?.episodesWatched || 0;
            players.push({
                id: friend.id,
                name: friend.name,
                avatar: friend.avatar?.large,
                isMe: false,
                level: calculateLevel(realEps).computedLevel,
                pl: calculatePL(realEps, quizPointsMap[friend.id] || 0)
            });
        });"""

code = code.replace(target_friends, replacement_friends)

with open('src/components/ArenaView.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("ArenaView real stats updated!")