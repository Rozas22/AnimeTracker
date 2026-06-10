import sys

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

target = """          <button
            className={`bottom-nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => handleTabClick('analytics')}
          >
            <BarChart2 size={20} />
            <span>Análisis</span>
          </button>"""

replacement = """          <button 
            className={`bottom-nav-item ${activeTab === 'arena' ? 'active' : ''}`}
            onClick={() => handleTabClick('arena')}
          >
            <Swords size={20} />
            <span>Arena</span>
          </button>

          <button
            className={`bottom-nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => handleTabClick('analytics')}
          >
            <BarChart2 size={20} />
            <span>Análisis</span>
          </button>"""

code = code.replace(target, replacement)

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Mobile nav updated!")