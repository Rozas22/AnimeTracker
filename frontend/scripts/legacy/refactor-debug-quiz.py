import sys

with open('generate-quiz.js', 'r', encoding='utf-8') as f:
    code = f.read()

target1 = """// Inicializar Supabase (usa las variables de entorno de Vercel)
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);"""

replacement1 = """// Inicializar Supabase (usa las variables de entorno de Vercel)
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

console.log("Supabase Env Variables Debug:");
console.log("URL exists:", !!supabaseUrl);
console.log("Key exists:", !!supabaseKey);
console.log("Key starts with:", supabaseKey ? supabaseKey.substring(0, 5) + "..." : "null");

const supabase = createClient(supabaseUrl, supabaseKey);"""

code = code.replace(target1, replacement1)

with open('generate-quiz.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Debug added!")