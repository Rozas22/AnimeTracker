import sys

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Fix GraphQL query for social activity
target_query = "activities(type: FOLLOWING, sort: ID_DESC) {"
replacement_query = "activities(isFollowing: true, sort: ID_DESC) {"
code = code.replace(target_query, replacement_query)

target_on_type = "... on FollowingActivity {"
replacement_on_type = "... on ListActivity {"
code = code.replace(target_on_type, replacement_on_type)

# 2. Add Arena button to sidebar
target_sidebar = """          <button 
            className={`sidebar-nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => handleTabClick('analytics')}
          >
            <BarChart2 size={18} />
            <span>Análisis</span>
          </button>"""

replacement_sidebar = """          <button 
            className={`sidebar-nav-item ${activeTab === 'arena' ? 'active' : ''}`}
            onClick={() => handleTabClick('arena')}
          >
            <Swords size={18} />
            <span>Arena</span>
          </button>
          
          <button 
            className={`sidebar-nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => handleTabClick('analytics')}
          >
            <BarChart2 size={18} />
            <span>Análisis</span>
          </button>"""

code = code.replace(target_sidebar, replacement_sidebar)

# 3. Add Arena button to mobile bottom nav
target_bottom_nav = """        <button 
          className={`bottom-nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => handleTabClick('analytics')}
        >
          <BarChart2 size={20} />
          <span>Análisis</span>
        </button>"""

replacement_bottom_nav = """        <button 
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

code = code.replace(target_bottom_nav, replacement_bottom_nav)

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Nav and Social query fixed!")