import sys

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

target1 = """                    onClick={() => { onTabClick('mylist'); onSubTabClick('CURRENT'); }}"""
replacement1 = """                    onClick={() => { onTabClick('mylist', isOwnProfile ? null : user.name); onSubTabClick('CURRENT'); }}"""
code = code.replace(target1, replacement1)

target2 = """              <div className="stat-item clickable" onClick={() => { onTabClick('mylist'); onSubTabClick('COMPLETED'); }} style={{ cursor: 'pointer' }}>"""
replacement2 = """              <div className="stat-item clickable" onClick={() => { onTabClick('mylist', isOwnProfile ? null : user.name); onSubTabClick('COMPLETED'); }} style={{ cursor: 'pointer' }}>"""
code = code.replace(target2, replacement2)

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("ProfileDisplay updated to pass user.name!")