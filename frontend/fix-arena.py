import sys

with open('src/components/ArenaView.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

target = """    const fetchLeaderboard = async () => {
      if (!user) return;
      setLoading(true);"""

replacement = """    const fetchLeaderboard = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);"""

code = code.replace(target, replacement)

with open('src/components/ArenaView.jsx', 'w', encoding='utf-8') as f:
    f.write(code)
print("ArenaView fixed!")