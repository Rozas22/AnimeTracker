import sys

with open('src/index.css', 'r', encoding='utf-8', errors='ignore') as f:
    css = f.read()

target = """.profile-frame {
   position: absolute;
   top: -5%;
   left: -5%;
   width: 110%;
   height: 110%;"""

replacement = """.profile-frame {
   position: absolute;
   top: -16%;
   left: -16%;
   width: 132%;
   height: 132%;"""

css = css.replace(target, replacement)

with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("CSS updated!")