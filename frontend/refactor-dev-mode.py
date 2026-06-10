import sys

with open('src/components/ArenaView.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

target = """        <button 
           className="btn-primary" 
           style={{ marginTop: '1.5rem', padding: '0.8rem 2rem', fontSize: '1.1rem', background: 'linear-gradient(135deg, #FF9800, #F44336)', border: 'none', borderRadius: '30px', boxShadow: '0 4px 15px rgba(244, 67, 54, 0.4)' }}
           onClick={handleStartQuiz}
        >
           🎲 Jugar Quiz Diario (+PL)
        </button>"""

replacement = """        <button 
           className="btn-primary" 
           style={{ marginTop: '1.5rem', padding: '0.8rem 2rem', fontSize: '1.1rem', background: 'linear-gradient(135deg, #FF9800, #F44336)', border: 'none', borderRadius: '30px', boxShadow: '0 4px 15px rgba(244, 67, 54, 0.4)' }}
           onClick={handleStartQuiz}
        >
           🎲 Jugar Quiz Diario (+PL)
        </button>
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
        )}"""

code = code.replace(target, replacement)

with open('src/components/ArenaView.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Dev mode reset button added!")