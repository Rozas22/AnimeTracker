import sys

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

target_import = "import ArenaView from './components/ArenaView';"
replacement_import = "import ArenaView from './components/ArenaView';\nimport ListaDesplegable from './components/ListaDesplegable';"
code = code.replace(target_import, replacement_import)

target_insert = """              </div>
            </CollapsibleSection>
          </div>
        </div>
      </div>"""

replacement_insert = """              </div>
            </CollapsibleSection>

            <ListaDesplegable userId={user.id} />
          </div>
        </div>
      </div>"""
code = code.replace(target_insert, replacement_insert)

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("ProfileDisplay updated with ListaDesplegable!")