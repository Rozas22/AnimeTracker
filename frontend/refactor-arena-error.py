import sys

with open('src/components/ArenaView.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

target = """          const res = await fetch('/api/generate-quiz');
          if (!res.ok) throw new Error('Error al generar quiz');
          const data = await res.json();
          setQuizQuestions(data);"""

replacement = """          const res = await fetch('/api/generate-quiz');
          if (!res.ok) throw new Error('Error al generar quiz');
          const data = await res.json();
          if (data.error) {
              alert(data.error);
              setShowQuizModal(false);
              return;
          }
          setQuizQuestions(data);"""

code = code.replace(target, replacement)

with open('src/components/ArenaView.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("ArenaView error handling added!")