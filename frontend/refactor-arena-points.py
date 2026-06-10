import sys

with open('src/components/ArenaView.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

target_fetch = """            const { data, error } = await supabase
              .from('users')
              .select('anilist_id, quiz_points')
              .in('anilist_id', ids);
              
            if (!error && data) {
                console.log('Supabase connection test - Data returned:', data);
                data.forEach(row => {
                    quizPointsMap[row.anilist_id] = row.quiz_points;
                });
            }"""

replacement_fetch = """            const { data, error } = await supabase
              .from('users')
              .select('anilist_id, quiz_points, anime_points')
              .in('anilist_id', ids);
              
            if (!error && data) {
                console.log('Supabase connection test - Data returned:', data);
                data.forEach(row => {
                    quizPointsMap[row.anilist_id] = {
                      quiz: row.quiz_points || 0,
                      anime: row.anime_points || 0
                    };
                });
            }"""

code = code.replace(target_fetch, replacement_fetch)

target_me = """        players.push({
            id: user.id,
            name: user.name,
            avatar: user.avatar?.large || user.avatar,
            isMe: true,
            level: calculateLevel(userEps).computedLevel,
            pl: calculatePL(userEps, quizPointsMap[user.id] || 0)
        });"""

replacement_me = """        const userPoints = quizPointsMap[user.id] || { quiz: 0, anime: 0 };
        // Fallback to realEps * 10 if anime_points is 0 (just in case they haven't synced yet)
        const userAnimePoints = userPoints.anime > 0 ? userPoints.anime : (userEps * 10);
        
        players.push({
            id: user.id,
            name: user.name,
            avatar: user.avatar?.large || user.avatar,
            isMe: true,
            level: calculateLevel(userEps).computedLevel,
            pl: userAnimePoints + userPoints.quiz
        });"""

code = code.replace(target_me, replacement_me)

target_friend = """        // Add friends using their real stats from AniList + quiz points from Supabase
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

replacement_friend = """        // Add friends using their real stats from AniList + points from Supabase
        anilistFriends?.forEach(friend => {
            const realEps = friend.statistics?.anime?.episodesWatched || 0;
            const friendPoints = quizPointsMap[friend.id] || { quiz: 0, anime: 0 };
            const friendAnimePoints = friendPoints.anime > 0 ? friendPoints.anime : (realEps * 10);

            players.push({
                id: friend.id,
                name: friend.name,
                avatar: friend.avatar?.large,
                isMe: false,
                level: calculateLevel(realEps).computedLevel,
                pl: friendAnimePoints + friendPoints.quiz
            });
        });"""

code = code.replace(target_friend, replacement_friend)

with open('src/components/ArenaView.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("ArenaView updated for anime_points!")