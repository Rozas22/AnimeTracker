import sys

with open('generate-quiz.js', 'r', encoding='utf-8') as f:
    code = f.read()

target1 = """    } catch (err) {
        console.error('API Error:', err);
        return res.status(500).json({ error: 'Internal Server Error', details: err.message });
    }"""

replacement1 = """    } catch (err) {
        console.error('Error detallado en API:', err.message || err);
        return res.status(200).json({ error: 'No se pudo generar el quiz en este momento' });
    }"""

code = code.replace(target1, replacement1)

target2 = """            return res.status(500).json({ error: 'GEMINI_API_KEY is missing and DB is empty' });"""

replacement2 = """            console.error('Error detallado en API: GEMINI_API_KEY is missing and DB is empty');
            return res.status(200).json({ error: 'No se pudo generar el quiz en este momento' });"""

code = code.replace(target2, replacement2)

with open('generate-quiz.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("API refactored!")