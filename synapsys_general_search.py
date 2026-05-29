# synapsys_general_search.py
# Python 3.11+
# pip install "fastapi>=0.110" "uvicorn[standard]>=0.29" "requests>=2.31" "openai>=1.30.0" "python-dotenv>=1.0.1" "beautifulsoup4>=4.12" "lxml>=5.2"

from __future__ import annotations

import os
import re
import time
from typing import Any, Dict, List, Optional
from urllib.parse import quote_plus, unquote, urlparse, parse_qs

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from openai import OpenAI
from pydantic import BaseModel, Field

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4.1-mini").strip()
SERPER_API_KEY = os.getenv("SERPER_API_KEY", "").strip()
REQUEST_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT", "15"))
USER_AGENT = os.getenv(
    "USER_AGENT",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
).strip()

if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY não configurada no .env")

client = OpenAI(api_key=OPENAI_API_KEY)
app = FastAPI(title="Synapsys General Knowledge + Web Search")


class AnalyzeInput(BaseModel):
    input: str = Field(..., min_length=1)
    force_web_search: bool = False
    max_sources: int = Field(default=5, ge=1, le=8)


def http_get(url: str, **kwargs) -> requests.Response:
    headers = kwargs.pop("headers", {})
    headers.setdefault("User-Agent", USER_AGENT)
    resp = requests.get(url, headers=headers, timeout=REQUEST_TIMEOUT, allow_redirects=True, **kwargs)
    resp.raise_for_status()
    return resp


def http_post(url: str, **kwargs) -> requests.Response:
    headers = kwargs.pop("headers", {})
    headers.setdefault("User-Agent", USER_AGENT)
    resp = requests.post(url, headers=headers, timeout=REQUEST_TIMEOUT, **kwargs)
    resp.raise_for_status()
    return resp


def should_search_web(user_input: str) -> bool:
    text = (user_input or "").lower()

    triggers = [
        "hoje", "agora", "atual", "atualizado", "último", "ultima", "últimas", "ultimas",
        "notícia", "noticias", "preço", "precos", "cotação", "cotacao",
        "mercado", "ranking", "melhor", "pior", "comparar", "comparação", "comparacao",
        "lei", "leis", "mudou", "mudança", "mudanca", "tendência", "tendencia",
        "pesquise", "pesquisar", "busque", "buscar", "procure", "pesquisa",
        "vale a pena", "review", "avaliação", "avaliacao", "lançamento", "lancamento"
    ]
    return any(term in text for term in triggers)


def llm_chat(system_prompt: str, user_prompt: str) -> str:
    response = client.responses.create(
        model=OPENAI_MODEL,
        input=f"SYSTEM:\n{system_prompt}\n\nUSER:\n{user_prompt}",
    )
    text = getattr(response, "output_text", None)
    if text:
        return text.strip()

    try:
        parts = []
        for item in response.output:
            for c in getattr(item, "content", []):
                if getattr(c, "type", "") == "output_text":
                    parts.append(c.text)
        return "\n".join(parts).strip()
    except Exception:
        return ""


def generate_search_queries(user_input: str) -> List[str]:
    system_prompt = (
        "Você gera consultas curtas e eficientes para busca web. "
        "Retorne no máximo 4 linhas, uma query por linha, sem numeração e sem explicação."
    )
    text = llm_chat(system_prompt, f"Pergunta:\n{user_input}")
    queries = [q.strip(" -\t") for q in text.splitlines() if q.strip()]
    return queries[:4] if queries else [user_input]


def normalize_result_url(url: str) -> str:
    if not url:
        return ""

    parsed = urlparse(url)

    if "duckduckgo.com" in parsed.netloc and parsed.path.startswith("/l/"):
        qs = parse_qs(parsed.query)
        uddg = qs.get("uddg", [""])[0]
        if uddg:
            return unquote(uddg)

    if url.startswith("//"):
        return "https:" + url

    return url


def search_web_serper(query: str, max_results: int = 5) -> List[Dict[str, str]]:
    if not SERPER_API_KEY:
        return []

    resp = http_post(
        "https://google.serper.dev/search",
        headers={
            "X-API-KEY": SERPER_API_KEY,
            "Content-Type": "application/json",
        },
        json={"q": query, "num": max_results},
    )
    data = resp.json()

    results: List[Dict[str, str]] = []
    for item in data.get("organic", [])[:max_results]:
        link = normalize_result_url(item.get("link", "").strip())
        if not link:
            continue
        results.append(
            {
                "title": item.get("title", "").strip(),
                "link": link,
                "snippet": item.get("snippet", "").strip(),
            }
        )
    return results


def search_web_duckduckgo_fallback(query: str, max_results: int = 5) -> List[Dict[str, str]]:
    resp = http_get(f"https://html.duckduckgo.com/html/?q={quote_plus(query)}")
    soup = BeautifulSoup(resp.text, "lxml")

    results: List[Dict[str, str]] = []
    for a in soup.select("a.result__a")[:max_results]:
        title = a.get_text(" ", strip=True)
        link = normalize_result_url(a.get("href", "").strip())
        if not link:
            continue
        results.append({"title": title, "link": link, "snippet": ""})

    return results


def fetch_page_text(url: str, max_chars: int = 5000) -> str:
    resp = http_get(url)
    content_type = resp.headers.get("Content-Type", "").lower()

    if "text/html" not in content_type:
        return f"Conteúdo não-HTML ou não suportado: {content_type}"

    soup = BeautifulSoup(resp.text, "lxml")

    for tag in soup(["script", "style", "noscript", "svg", "header", "footer", "form", "nav", "aside"]):
        tag.decompose()

    text = soup.get_text("\n", strip=True)
    text = re.sub(r"\n{2,}", "\n", text)
    return text[:max_chars]


def unique_by_link(items: List[Dict[str, str]]) -> List[Dict[str, str]]:
    seen = set()
    out: List[Dict[str, str]] = []
    for item in items:
        link = item.get("link", "").strip()
        if not link or link in seen:
            continue
        seen.add(link)
        out.append(item)
    return out


def web_search_pipeline(user_input: str, max_sources: int = 5) -> List[Dict[str, Any]]:
    queries = generate_search_queries(user_input)
    gathered: List[Dict[str, str]] = []

    for query in queries:
        try:
            results = search_web_serper(query, max_results=max_sources)
            if not results:
                results = search_web_duckduckgo_fallback(query, max_results=max_sources)
            gathered.extend(results)
            time.sleep(0.25)
        except Exception:
            continue

    gathered = unique_by_link(gathered)[:max_sources]

    enriched: List[Dict[str, Any]] = []
    for item in gathered:
        try:
            page_text = fetch_page_text(item["link"])
        except Exception as e:
            page_text = f"Falha ao extrair conteúdo: {type(e).__name__}: {e}"

        enriched.append(
            {
                "title": item.get("title", ""),
                "link": item.get("link", ""),
                "snippet": item.get("snippet", ""),
                "content": page_text,
            }
        )

    return enriched


def build_final_answer(user_input: str, web_sources: Optional[List[Dict[str, Any]]] = None) -> str:
    system_prompt = """
Você é a SynapsysAI.
Regras:
- Responda em português do Brasil.
- Seja objetiva, prática e clara.
- Se houver fontes web, use apenas o que estiver sustentado nelas.
- Não invente fatos.
- Se houver divergência entre fontes, sinalize.
- Estruture em:
  1. Resposta
  2. Pontos principais
  3. Próxima ação recomendada
"""

    sources_text = "Nenhuma"
    if web_sources:
        chunks = []
        for i, src in enumerate(web_sources, start=1):
            chunks.append(
                f"""FONTE {i}
Título: {src.get('title', '')}
URL: {src.get('link', '')}
Snippet: {src.get('snippet', '')}
Conteúdo:
{src.get('content', '')[:3500]}
"""
            )
        sources_text = "\n\n".join(chunks)

    return llm_chat(
        system_prompt,
        f"PERGUNTA:\n{user_input}\n\nFONTES WEB:\n{sources_text}",
    )


@app.get("/health")
def health() -> Dict[str, Any]:
    return {
        "ok": True,
        "service": "synapsys-general-search",
        "openai_model": OPENAI_MODEL,
        "serper_enabled": bool(SERPER_API_KEY),
    }


@app.post("/synapsys/analyze")
def analyze(data: AnalyzeInput) -> Dict[str, Any]:
    try:
        user_input = data.input.strip()
        if not user_input:
            raise HTTPException(status_code=400, detail="input obrigatório")

        use_web = data.force_web_search or should_search_web(user_input)
        web_sources: List[Dict[str, Any]] = []

        if use_web:
            try:
                web_sources = web_search_pipeline(user_input, max_sources=data.max_sources)
            except Exception as e:
                web_sources = [
                    {
                        "title": "web_search_error",
                        "link": "",
                        "snippet": "",
                        "content": f"Erro na pesquisa: {type(e).__name__}: {e}",
                    }
                ]

        try:
            output = build_final_answer(user_input, web_sources if use_web else None)
        except Exception as e:
            output = f"[ERRO_BUILD_FINAL_ANSWER] {type(e).__name__}: {e}"

        return {
            "ok": True,
            "used_web_search": use_web,
            "sources_count": len(web_sources),
            "sources": [{"title": s.get("title", ""), "link": s.get("link", "")} for s in web_sources],
            "output": output,
        }
    except Exception as e:
        return {
            "ok": False,
            "error": f"{type(e).__name__}: {e}"
        }
