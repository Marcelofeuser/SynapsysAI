#!/usr/bin/env python3
"""
patch_frontend_phase1.py
- Copia os 3 novos arquivos JSX para src/pages/
- Adiciona rotas em App.jsx
Rodar: python3 patch_frontend_phase1.py
"""

import os
import re
import shutil
import sys

BASE   = "/Volumes/SSD_MAC/Projects/SynapsysAI/frontend"
SRC    = os.path.join(BASE, "src")
PAGES  = os.path.join(SRC, "pages")
APP    = os.path.join(SRC, "App.jsx")

# Diretório onde este script está (os JSX foram copiados junto)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# ── 1. Verifica estrutura ──────────────────────────────────────────────────────
if not os.path.isdir(PAGES):
    print(f"ERRO: pasta pages não encontrada em {PAGES}")
    sys.exit(1)

if not os.path.isfile(APP):
    print(f"ERRO: App.jsx não encontrado em {APP}")
    sys.exit(1)

# ── 2. Copia os JSX ─────────────────────────────────────────────────────────────
pages_to_copy = ["Transcription.jsx", "Copilot.jsx", "SkinAnalysis.jsx"]
for page in pages_to_copy:
    src_file = os.path.join(SCRIPT_DIR, page)
    dst_file = os.path.join(PAGES, page)
    if not os.path.isfile(src_file):
        print(f"ERRO: {page} não encontrado em {SCRIPT_DIR}")
        sys.exit(1)
    shutil.copy2(src_file, dst_file)
    print(f"  ✅ Copiado: {page}")

# ── 3. Atualiza App.jsx ──────────────────────────────────────────────────────────
with open(APP, "r", encoding="utf-8") as f:
    app_content = f.read()

# Verifica se já foi aplicado
if "Transcription" in app_content and "Copilot" in app_content and "SkinAnalysis" in app_content:
    print("\nAVISO: Rotas já existem em App.jsx — patch de roteamento ignorado.")
else:
    # ── 3a. Adicionar imports ───────────────────────────────────────────────────
    NEW_IMPORTS = """import Transcription from "./pages/Transcription";
import Copilot from "./pages/Copilot";
import SkinAnalysis from "./pages/SkinAnalysis";"""

    # Tenta encontrar o último import statement para adicionar depois
    import_pattern = r"(import\s+\w.*\n)"
    all_imports = list(re.finditer(import_pattern, app_content))

    if all_imports:
        last_import = all_imports[-1]
        insert_pos = last_import.end()
        app_content = (
            app_content[:insert_pos]
            + NEW_IMPORTS + "\n"
            + app_content[insert_pos:]
        )
        print("  ✅ Imports adicionados ao App.jsx")
    else:
        # Fallback: adiciona no início do arquivo após a primeira linha
        first_newline = app_content.find("\n")
        if first_newline > 0:
            app_content = (
                app_content[:first_newline + 1]
                + NEW_IMPORTS + "\n"
                + app_content[first_newline + 1:]
            )
            print("  ✅ Imports adicionados (fallback) ao App.jsx")

    # ── 3b. Adicionar rotas ─────────────────────────────────────────────────────
    # Padrões comuns de rotas em React Router v6
    NEW_ROUTES = """        <Route path="/transcricao" element={<Transcription />} />
        <Route path="/copilot" element={<Copilot />} />
        <Route path="/skin-analysis" element={<SkinAnalysis />} />"""

    # Estratégia 1: encontrar </Routes> e inserir antes
    if "</Routes>" in app_content:
        app_content = app_content.replace(
            "</Routes>",
            NEW_ROUTES + "\n      </Routes>",
            1
        )
        print("  ✅ Rotas adicionadas antes de </Routes>")

    # Estratégia 2: encontrar </Router> se Routes não existir
    elif "</Router>" in app_content:
        app_content = app_content.replace(
            "</Router>",
            NEW_ROUTES + "\n      </Router>",
            1
        )
        print("  ✅ Rotas adicionadas antes de </Router>")

    # Estratégia 3: encontrar último </Route> e inserir depois
    else:
        last_route = app_content.rfind("</Route>")
        if last_route > 0:
            insert_pos = last_route + len("</Route>")
            app_content = (
                app_content[:insert_pos]
                + "\n" + NEW_ROUTES
                + app_content[insert_pos:]
            )
            print("  ✅ Rotas adicionadas após último </Route>")
        else:
            print("""
ATENÇÃO: Não foi possível adicionar as rotas automaticamente.
Adicione manualmente em App.jsx:

import Transcription from "./pages/Transcription";
import Copilot from "./pages/Copilot";
import SkinAnalysis from "./pages/SkinAnalysis";

// Dentro do <Routes>:
<Route path="/transcricao"  element={<Transcription />} />
<Route path="/copilot"      element={<Copilot />} />
<Route path="/skin-analysis" element={<SkinAnalysis />} />
""")

    with open(APP, "w", encoding="utf-8") as f:
        f.write(app_content)
    print("  ✅ App.jsx atualizado")

print("""
════════════════════════════════════════════════════════
✅ FASE 1 — Frontend aplicado!

Páginas criadas:
  /transcricao    → Transcription.jsx
  /copilot        → Copilot.jsx
  /skin-analysis  → SkinAnalysis.jsx

Próximos passos:
  1. cd /Volumes/SSD_MAC/Projects/SynapsysAI/frontend
  2. npm run dev  → testar localmente
  3. git add -A && git commit -m "feat: AI Phase 1 pages" && git push

Se as rotas não aparecerem no menu, adicione links de navegação
em qualquer componente de sidebar/navbar existente.
════════════════════════════════════════════════════════
""")
