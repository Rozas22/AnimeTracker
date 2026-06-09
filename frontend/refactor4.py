import sys

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Fix str(min(pct, 100)) and str(pct)
code = code.replace("str(min(pct, 100))", "String(Math.min(pct, 100))")
code = code.replace("str(pct)", "String(pct)")

# Wrap ProfileDisplay body in try/catch
# First find ProfileDisplay signature
pd_sig = "}) => {\n  if (!user?.id) return null;\n"
pd_start = code.find(pd_sig)
if pd_start != -1:
    body_start = pd_start + len(pd_sig)
    # The end of ProfileDisplay is after the return statement
    # Let's find the end of ProfileDisplay by finding the next function or component.
    pd_end = code.find("const App = () => {", body_start)
    if pd_end == -1:
        pd_end = code.find("export default function App() {", body_start)
    
    if pd_end != -1:
        # We need to backtrack to find the closing brace of ProfileDisplay
        # which is right before export default function App() {
        # Actually it's better to just inject try/catch logic.
        body = code[body_start:pd_end]
        
        # We know body starts with const isDesktop
        # and ends with };
        # Let's find the last };
        last_brace = body.rfind("};\n")
        if last_brace != -1:
            inner_body = body[:last_brace]
            
            # Wrap inner_body
            indented_body = "\n".join(["  " + line for line in inner_body.split("\n")])
            new_body = f'''
  try {{
{indented_body}
  }} catch (err) {{
    console.error('Error rendering ProfileDisplay:', err);
    return (
      <div className="card" style={{ padding: '3rem 1rem', textAlign: 'center', marginTop: '1rem' }}>
        <ShieldAlert size={{48}} style={{ color: 'var(--color-accent-red)', marginBottom: '1rem', opacity: 0.8 }} />
        <h3>Error al renderizar el perfil</h3>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>Ha ocurrido un problema al procesar los datos de este perfil. Intenta recargar la página.</p>
      </div>
    );
  }}
'''
            code = code[:body_start] + new_body + body[last_brace:] + code[pd_end:]

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Refactor 4 applied")