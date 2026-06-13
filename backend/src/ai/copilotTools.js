// src/ai/copilotTools.js — Ferramentas reais do Copilot multi-produto (Supabase)
// Todas as queries filtram por user_id + product.

const TOOLS = [
  {
    type: "function",
    function: {
      name: "buscar_pacientes",
      description: "Busca pacientes/clientes por nome (parcial) ou lista os mais recentes",
      parameters: {
        type: "object",
        properties: {
          nome:   { type: "string", description: "Nome parcial ou completo (opcional)" },
          limite: { type: "number", description: "Máximo de resultados — padrão 10, máx 50" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_consultas",
      description: "Busca consultas/agendamentos com filtros opcionais de paciente, status e período",
      parameters: {
        type: "object",
        properties: {
          patient_id:  { type: "string", description: "UUID do paciente (opcional)" },
          status:      { type: "string", enum: ["agendada","realizada","cancelada","remarcada"] },
          data_inicio: { type: "string", description: "Data início ISO 8601" },
          data_fim:    { type: "string", description: "Data fim ISO 8601" },
          limite:      { type: "number", description: "Máximo de resultados — padrão 20" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_historico_paciente",
      description: "Retorna dados cadastrais completos + todas as consultas de um paciente",
      parameters: {
        type: "object",
        properties: { patient_id: { type: "string", description: "UUID do paciente" } },
        required: ["patient_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "agendar_consulta",
      description: "Agenda uma nova consulta para um paciente na data/hora informada",
      parameters: {
        type: "object",
        properties: {
          patient_id:  { type: "string", description: "UUID do paciente" },
          data_hora:   { type: "string", description: "Data e hora ISO 8601" },
          duracao_min: { type: "number", description: "Duração em minutos (padrão 50)" },
          notas:       { type: "string", description: "Observações (opcional)" },
        },
        required: ["patient_id", "data_hora"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "remarcar_consulta",
      description: "Remarca uma consulta existente para uma nova data/hora",
      parameters: {
        type: "object",
        properties: {
          consulta_id:    { type: "string", description: "UUID da consulta" },
          nova_data_hora: { type: "string", description: "Nova data e hora ISO 8601" },
        },
        required: ["consulta_id", "nova_data_hora"],
      },
    },
  },
];

// executeTool agora recebe product e filtra por user_id + product
async function executeTool(name, args, db, userId, product = "psicothera") {
  try {
    switch (name) {

      case "buscar_pacientes": {
        const limite = Math.min(args.limite || 10, 50);
        let query = db
          .from("copilot_patients")
          .select("id, nome, data_nascimento, telefone, diagnostico, cid10, medicamentos")
          .eq("user_id", userId)
          .eq("product", product)
          .order("nome")
          .limit(limite);
        if (args.nome) query = query.ilike("nome", `%${args.nome}%`);
        const { data, error } = await query;
        if (error) return `Erro ao buscar pacientes: ${error.message}`;
        if (!data || data.length === 0) return "Nenhum paciente encontrado.";
        return JSON.stringify(data);
      }

      case "buscar_consultas": {
        const limite = Math.min(args.limite || 20, 100);
        let query = db
          .from("copilot_appointments")
          .select("id, data_hora, duracao_min, tipo, status, notas, patient_id, copilot_patients(nome, diagnostico)")
          .eq("user_id", userId)
          .eq("product", product)
          .order("data_hora", { ascending: false })
          .limit(limite);
        if (args.patient_id)  query = query.eq("patient_id", args.patient_id);
        if (args.status)      query = query.eq("status", args.status);
        if (args.data_inicio) query = query.gte("data_hora", args.data_inicio);
        if (args.data_fim)    query = query.lte("data_hora", args.data_fim);
        const { data, error } = await query;
        if (error) return `Erro ao buscar consultas: ${error.message}`;
        if (!data || data.length === 0) return "Nenhuma consulta encontrada.";
        return JSON.stringify(data);
      }

      case "buscar_historico_paciente": {
        const { data: patient, error: pe } = await db
          .from("copilot_patients")
          .select("*")
          .eq("id", args.patient_id)
          .eq("user_id", userId)
          .eq("product", product)
          .single();
        if (pe || !patient) return "Paciente não encontrado.";
        const { data: appointments } = await db
          .from("copilot_appointments")
          .select("id, data_hora, duracao_min, tipo, status, notas")
          .eq("patient_id", args.patient_id)
          .eq("product", product)
          .order("data_hora", { ascending: false })
          .limit(100);
        return JSON.stringify({ ...patient, consultas: appointments || [] });
      }

      case "agendar_consulta": {
        const { data, error } = await db
          .from("copilot_appointments")
          .insert({
            user_id:     userId,
            product,
            patient_id:  args.patient_id,
            data_hora:   args.data_hora,
            duracao_min: args.duracao_min || 50,
            notas:       args.notas || null,
            status:      "agendada",
          })
          .select("id, data_hora, status")
          .single();
        if (error) return `Erro ao agendar: ${error.message}`;
        return `Consulta agendada com sucesso. ID: ${data.id} | Data: ${new Date(data.data_hora).toLocaleString("pt-BR")}`;
      }

      case "remarcar_consulta": {
        const { data, error } = await db
          .from("copilot_appointments")
          .update({ data_hora: args.nova_data_hora, status: "agendada", updated_at: new Date().toISOString() })
          .eq("id", args.consulta_id)
          .eq("user_id", userId)
          .eq("product", product)
          .select("id, data_hora")
          .single();
        if (error) return `Erro ao remarcar: ${error.message}`;
        if (!data)  return "Consulta não encontrada ou sem permissão.";
        return `Consulta remarcada com sucesso. Nova data: ${new Date(data.data_hora).toLocaleString("pt-BR")}`;
      }

      default:
        return `Ferramenta "${name}" não reconhecida.`;
    }
  } catch (err) {
    return `Erro interno na ferramenta ${name}: ${err.message}`;
  }
}

module.exports = { TOOLS, executeTool };
