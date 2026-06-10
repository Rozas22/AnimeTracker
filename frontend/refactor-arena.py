import sys

with open('src/components/ArenaView.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Add console.log inside the ArenaView component
target_log = """  const [loading, setLoading] = useState(true);"""
replacement_log = """  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('Arena montada');
  }, []);"""

code = code.replace(target_log, replacement_log)

# 2. Add flex column and zIndex to arena-view
target_css = """    <div className="arena-view" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '2rem' }}>"""
replacement_css = """    <div className="arena-view" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '2rem', display: 'flex', flexDirection: 'column', width: '100%', position: 'relative', zIndex: 100 }}>"""

code = code.replace(target_css, replacement_css)

with open('src/components/ArenaView.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("ArenaView updated!")