import sys
import re

with open('src/components/ArenaView.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

replacement = """        </button>
        {user?.name === 'Rozas22' && (
           <button
             onClick={() => {
                localStorage.removeItem('lastQuizDate');
                alert('Modo Dev: Restricción de fecha eliminada. Puedes jugar de nuevo.');
             }}
             style={{ display: 'block', margin: '1rem auto 0 auto', background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)', borderRadius: '8px', padding: '0.5rem 1rem', fontSize: '0.8rem', cursor: 'pointer' }}
           >
             🛠️ Reset Quiz (Modo Dev)
           </button>
        )}
      </div>"""

code = code.replace("        </button>\n      </div>", replacement)

with open('src/components/ArenaView.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Dev mode reset button added!")