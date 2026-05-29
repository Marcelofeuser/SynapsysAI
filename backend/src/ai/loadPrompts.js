const fs = require("fs");
const path = require("path");

const PROMPT_ROOTS = [
  // repo root (ex: /SynapsysAI)
  path.resolve(__dirname, "../../.."),
  // backend root (ex: /SynapsysAI/backend)
  path.resolve(__dirname, "../.."),
];

function resolvePromptPath(relativePath) {
  for (const root of PROMPT_ROOTS) {
    const candidate = path.join(root, relativePath);
    if (fs.existsSync(candidate)) return candidate;
  }

  return null;
}

function readPrompt(relativePath, { optional = false } = {}) {
  const fullPath = resolvePromptPath(relativePath);

  if (!fullPath) {
    if (optional) return "";

    const attempted = PROMPT_ROOTS.map((root) => path.join(root, relativePath)).join(" | ");
    throw new Error(`Prompt não encontrado: ${relativePath}. Tentativas: ${attempted}`);
  }

  return fs.readFileSync(fullPath, "utf-8").trim();
}

function loadCustomKnowledge() {
  const customDirs = [
    path.resolve(__dirname, "../../knowledge/custom"),
    path.resolve(__dirname, "../../../knowledge/custom"),
  ];

  let customDir = null;
  for (const d of customDirs) {
    if (fs.existsSync(d)) { customDir = d; break; }
  }

  if (!customDir) return "";

  const files = fs.readdirSync(customDir).filter(f =>
    f.endsWith(".txt") || f.endsWith(".md") || f.endsWith(".json") || f.endsWith(".csv")
  );

  if (files.length === 0) return "";

  const parts = files.map(name => {
    try {
      const content = fs.readFileSync(path.join(customDir, name), "utf-8").trim();
      return `### Conhecimento: ${name}\n${content}`;
    } catch { return ""; }
  }).filter(Boolean);

  return parts.length > 0 ? `## Base de Conhecimento Customizada\n\n${parts.join("\n\n---\n\n")}` : "";
}

function loadAllPrompts() {
  const systemPrompt = readPrompt("prompts/system-prompt.md");
  const expertRules =
    readPrompt("prompts/expert-rules.md", { optional: true }) ||
    readPrompt("prompts/expert-rules.mdz", { optional: true });

  const saasContext = readPrompt("prompts/saas-context.md", { optional: true });
  const specialization = readPrompt("prompts/specialization-context.md", { optional: true });
  const customKnowledge = loadCustomKnowledge();

  return [systemPrompt, expertRules, saasContext, specialization, customKnowledge].filter(Boolean).join("\n\n");
}

function loadModePrompt(mode = "builder") {
  const normalizedMode = String(mode || "builder").toLowerCase();

  const modePrompts = {
    builder: [
      "Modo ativo: Builder.",
      "Foque em implementar funcionalidades completas com código de produção.",
      "Explique de forma prática, orientando estrutura, arquivos, lógica e testes.",
    ].join(" "),
    debugger: [
      "Modo ativo: Debugger.",
      "Foque em diagnóstico, causa raiz, correção segura e prevenção de regressão.",
      "Priorize análise antes de propor código.",
    ].join(" "),
    architect: [
      "Modo ativo: Architect.",
      "Foque em arquitetura SaaS, multi-tenancy, autenticação, permissões, billing, escalabilidade e organização sistêmica.",
      "Priorize desenho técnico e impacto estrutural.",
    ].join(" "),
  };

  return modePrompts[normalizedMode] || modePrompts.builder;
}

module.exports = {
  loadAllPrompts,
  loadModePrompt,
};
