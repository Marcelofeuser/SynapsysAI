// src/config/products.js — Registro de produtos do Copilot multi-tenant.
// Cada produto define identidade visual + URLs. O produto vem do path /:produto/copilot.

export const PRODUCTS = {
  psicothera: {
    id: "psicothera",
    name: "PsicoThera",
    copilotName: "PsicoThera Copilot",
    dashboardUrl: "https://psicothera.com.br/dashboard",
    theme: "light",
    accent: "teal",          // teal-600 etc
    emoji: "🤖",
    domain: "psicothera.com.br",
    quickPrompts: [
      { icon: "🧠", label: "Critérios diagnósticos", text: "Quais são os critérios diagnósticos para depressão maior?" },
      { icon: "⚖️", label: "Diagnóstico diferencial", text: "Explique os diagnósticos diferenciais para ansiedade generalizada." },
      { icon: "💊", label: "Farmacologia ISRS", text: "Quais são as indicações e contraindicações de ISRS?" },
      { icon: "🆘", label: "Avaliação de risco", text: "Como conduzir uma avaliação de risco de suicídio?" },
      { icon: "🫁", label: "Crise de pânico", text: "Protocolo para crise de pânico em consultório." },
      { icon: "📄", label: "Relatório clínico", text: "Redija um relatório psicológico breve baseado neste caso:" },
    ],
    greeting: "Olá! Sou seu copiloto clínico.",
    subtitle: "Posso buscar pacientes, consultar histórico, agendar sessões e responder perguntas clínicas.",
    contextLabel: "Paciente",
  },

  // Próximos produtos entram aqui. Exemplo de esqueleto:
  // mavve: {
  //   id: "mavve",
  //   name: "Mavvê Pratas",
  //   copilotName: "Assistente IA",
  //   dashboardUrl: "https://app.mavvepratas.com.br/dashboard",
  //   theme: "light",
  //   accent: "pink",
  //   emoji: "💎",
  //   domain: "mavvepratas.com.br",
  //   quickPrompts: [ ... ],
  //   greeting: "Olá! Sou seu assistente de vendas.",
  //   subtitle: "Posso buscar clientes, pedidos, estoque e responder dúvidas.",
  //   contextLabel: "Cliente",
  // },
};

export const DEFAULT_PRODUCT = "psicothera";

export function getProduct(slug) {
  return PRODUCTS[slug] || PRODUCTS[DEFAULT_PRODUCT];
}

// Mapa de classes Tailwind por accent (Tailwind precisa das classes literais no bundle)
export const ACCENT_CLASSES = {
  teal: {
    solid:       "bg-teal-600",
    solidHover:  "hover:bg-teal-700",
    text:        "text-teal-700",
    textHover:   "hover:text-teal-700",
    border:      "border-teal-300",
    borderHover: "hover:border-teal-300",
    bgSoft:      "bg-teal-50",
    bgSoftHover: "hover:bg-teal-100",
    borderSoft:  "border-teal-200",
    dot:         "bg-teal-500",
    gradFrom:    "from-teal-500",
    gradTo:      "to-emerald-600",
    shadow:      "shadow-teal-200",
    ring:        "focus:border-teal-400",
    focusWithin: "focus-within:border-teal-400",
  },
  pink: {
    solid:       "bg-pink-600",
    solidHover:  "hover:bg-pink-700",
    text:        "text-pink-700",
    textHover:   "hover:text-pink-700",
    border:      "border-pink-300",
    borderHover: "hover:border-pink-300",
    bgSoft:      "bg-pink-50",
    bgSoftHover: "hover:bg-pink-100",
    borderSoft:  "border-pink-200",
    dot:         "bg-pink-500",
    gradFrom:    "from-pink-500",
    gradTo:      "to-rose-600",
    shadow:      "shadow-pink-200",
    ring:        "focus:border-pink-400",
    focusWithin: "focus-within:border-pink-400",
  },
  purple: {
    solid:       "bg-purple-600",
    solidHover:  "hover:bg-purple-700",
    text:        "text-purple-700",
    textHover:   "hover:text-purple-700",
    border:      "border-purple-300",
    borderHover: "hover:border-purple-300",
    bgSoft:      "bg-purple-50",
    bgSoftHover: "hover:bg-purple-100",
    borderSoft:  "border-purple-200",
    dot:         "bg-purple-500",
    gradFrom:    "from-purple-500",
    gradTo:      "to-violet-600",
    shadow:      "shadow-purple-200",
    ring:        "focus:border-purple-400",
    focusWithin: "focus-within:border-purple-400",
  },
};

export function getAccent(accent) {
  return ACCENT_CLASSES[accent] || ACCENT_CLASSES.teal;
}
