import sys

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Fix GraphQL userId parsing
target_vars = "const variables = { userId };"
replacement_vars = "const variables = { userId: parseInt(userId, 10) };"
code = code.replace(target_vars, replacement_vars)

# 2. Add Carga Segura to Arena View
target_arena = "case 'arena':\n        return <ArenaView"
replacement_arena = "case 'arena':\n        if (!userData) return <div style={{ textAlign: 'center', padding: '4rem' }}><div className=\"loader\"></div><p style={{ color: 'var(--color-text-secondary)', marginTop: '1rem' }}>Cargando Arena...</p></div>;\n        return <ArenaView"
code = code.replace(target_arena, replacement_arena)

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

with open('src/components/ArenaView.jsx', 'r', encoding='utf-8') as f:
    arena_code = f.read()

# Make sure ArenaView doesn't crash on null user rendering
target_arena_render = "const userEps = user.statistics?.anime?.episodesWatched || 0;"
replacement_arena_render = "const userEps = user?.statistics?.anime?.episodesWatched || 0;"
arena_code = arena_code.replace(target_arena_render, replacement_arena_render)

with open('src/components/ArenaView.jsx', 'w', encoding='utf-8') as f:
    f.write(arena_code)

print("Hotfixes applied!")