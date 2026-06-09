import sys

with open('src/components/ArenaView.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

target = """            if (!error && data) {
                data.forEach(row => {"""

replacement = """            if (!error && data) {
                console.log('Supabase connection test - Data returned:', data);
                data.forEach(row => {"""

code = code.replace(target, replacement)

target2 = """            if (!error && data) {
                console.log('Supabase connection test - Data returned:', data);
                data.forEach(row => {
                    quizPointsMap[row.anilist_id] = row.quiz_points;
                });
            }
        } catch(e) {"""

replacement2 = """            if (!error && data) {
                console.log('Supabase connection test - Data returned:', data);
                data.forEach(row => {
                    quizPointsMap[row.anilist_id] = row.quiz_points;
                });
            } else if (error) {
                console.log('Supabase query error:', error);
            }
        } catch(e) {"""

code = code.replace(target2, replacement2)

with open('src/components/ArenaView.jsx', 'w', encoding='utf-8') as f:
    f.write(code)
print("ArenaView logs added!")