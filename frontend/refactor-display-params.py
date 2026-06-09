import sys

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

target = """const ProfileDisplay = ({ 
  user, 
  isOwnProfile, 
  animeList, 
  selectedFrame, 
  onTestAnimation, 
  children,
  onTabClick,
  onSubTabClick
}) => {"""

replacement = """const ProfileDisplay = ({ 
  user, 
  isOwnProfile, 
  animeList, 
  selectedFrame, 
  onTestAnimation, 
  children,
  onTabClick,
  onSubTabClick,
  userLeague
}) => {"""

code = code.replace(target, replacement)

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)
print("ProfileDisplay fixed!")