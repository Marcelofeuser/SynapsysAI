#!/usr/bin/env python3
"""
patch_frontend_phase2.py
Adiciona WhatsAppBot.jsx ao frontend e rota no App.jsx.
Rodar de: /Volumes/SSD_MAC/Projects/SynapsysAI/
"""

import os, re, shutil, sys

BASE       = "/Volumes/SSD_MAC/Projects/SynapsysAI"
PAGES      = os.path.join(BASE, "frontend", "src", "pages")
APP        = os.path.join(BASE, "frontend", "src", "App.jsx")
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# Copia JSX
src = os.path.join(SCRIPT_DIR, "WhatsAppBot.jsx")
if not os.path.isfile(src):
    print(f"ERRO: WhatsAppBot.jsx nao encontrado em {SCRIPT_DIR}")
    sys.exit(1)

shutil.copy2(src, os.path.join(PAGES, "WhatsAppBot.jsx"))
print("  ✅ WhatsAppBot.jsx copiado para src/pages/")

# Atualiza App.jsx
with open(APP, "r", encoding="utf-8") as f:
    app = f.read()

if "WhatsAppBot" in app:
    print("  AVISO: WhatsAppBot ja existe em App.jsx — pulando.")
else:
    # Adiciona import
    import_pattern = r"(import\s+\w.*\n)"
    all_imports = list(re.finditer(import_pattern, app))
    if all_imports:
        pos = all_imports[-1].end()
        app = app[:pos] + 'import WhatsAppBot from "./pages/WhatsAppBot";\n' + app[pos:]

    # Adiciona rota
    NEW_ROUTE = '        <Route path="/whatsapp-bot" element={<WhatsAppBot />} />'
    if "</Routes>" in app:
        app = app.replace("</Routes>", NEW_ROUTE + "\n      </Routes>", 1)
    elif "</Router>" in app:
        app = app.replace("</Router>", NEW_ROUTE + "\n      </Router>", 1)

    with open(APP, "w", encoding="utf-8") as f:
        f.write(app)
    print("  ✅ App.jsx atualizado — rota /whatsapp-bot adicionada")

print("""
════════════════════════════════════════════════════════
✅ Fase 2 — Frontend aplicado!

Próximos passos:

1. SQL no Supabase — cole o sql_phase2_whatsapp.sql

2. Backend:
   cd /Volumes/SSD_MAC/Projects/SynapsysAI/backend
   git add server.js && git commit -m "feat: WhatsApp bot routes" && git push

3. Frontend:
   cd /Volumes/SSD_MAC/Projects/SynapsysAI/frontend
   git add -A && git commit -m "feat: WhatsApp bot dashboard" && git push

4. Após o deploy, acesse /whatsapp-bot:
   - Aba "Configurar Bot": salve as configurações
   - Aba "Webhook": clique em "Ativar Webhook"
   - Pronto — bot 24/7 ativo!
════════════════════════════════════════════════════════
""")
