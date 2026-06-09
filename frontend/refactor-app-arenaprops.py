import sys

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

target = "case 'arena':\n        return <ArenaView user={userData} anilistFriends={anilistFriends} />;"
replacement = "case 'arena':\n        return <ArenaView user={userData} anilistFriends={anilistFriends} quizPoints={quizPoints} setQuizPoints={setQuizPoints} />;"
code = code.replace(target, replacement)

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)
print("App.jsx updated with Arena props!")