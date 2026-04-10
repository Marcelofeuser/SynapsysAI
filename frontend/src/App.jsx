import { useState } from "react";
import ReactMarkdown from "react-markdown";

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔥 pega variável do Vercel
  const API_URL =
    import.meta.env.VITE_API_URL ||
    "https://synapsys.insightdisc.com";

  console.log("API_URL FRONT:", API_URL);

  const sendMessage = async () => {
    if (!input) return;

    const userMessage = { role: "user", content: input };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/synapsys/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input }),
      });

      if (!res.ok) {
        throw new Error("Erro HTTP: " + res.status);
      }

      const data = await res.json();

      console.log("RESPOSTA API:", data);

      const aiMessage = {
        role: "ai",
        content:
          data.response ||
          data.details ||
          "A IA respondeu, mas sem conteúdo.",
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("ERRO FETCH:", error);

      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content:
            "Erro de conexão com o servidor. Verifique API_URL ou backend.",
        },
      ]);
    }

    setLoading(false);
  };

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h1>Synapsys AI</h1>

      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: 10,
          padding: 20,
          height: 400,
          overflowY: "auto",
          marginBottom: 20,
        }}
      >
        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              marginBottom: 10,
              textAlign: msg.role === "user" ? "right" : "left",
            }}
          >
            <strong>{msg.role === "user" ? "Você" : "Synapsys"}:</strong>
            {msg.role === "ai" ? (
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            ) : (
              <div>{msg.content}</div>
            )}
          </div>
        ))}
      </div>

      <input
        style={{ width: "70%", padding: 10 }}
        placeholder="Digite sua mensagem..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      <button onClick={sendMessage} style={{ padding: 10, marginLeft: 10 }}>
        Enviar
      </button>

      {loading && <p>Synapsys pensando...</p>}
    </div>
  );
}

export default App;