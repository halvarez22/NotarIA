import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import axios from 'axios'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // 1. Verificación de Autenticación (Regla 5 - SSD)
    // BYPASS TEMPORAL POR RATE LIMIT DE SUPABASE EN DESARROLLO
    // const { data: { user } } = await supabase.auth.getUser()
    // if (!user) {
    //  return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    // }

    const body = await request.json()
    const { query } = body

    if (!query) {
      return NextResponse.json({ error: 'Query es requerido' }, { status: 400 })
    }

    const ollamaUrl = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
    let embedding: number[] = [];

    try {
      // 2. Obtener el embedding usando OpenAI
      const openAiResponse = await axios.post(
        'https://api.openai.com/v1/embeddings',
        {
          input: `search_query: ${query}`,
          model: "text-embedding-3-small"
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      embedding = openAiResponse.data.data[0].embedding;
    } catch (e: any) {
      console.error("Error generating embedding:", e.response?.data || e.message);
      return NextResponse.json({ 
        error: `Fallo al generar el vector de búsqueda (OpenAI). Detalles: ${JSON.stringify(e.response?.data || e.message)}` 
      }, { status: 500 });
    }

    // 3. Ejecutar la búsqueda semántica en Supabase usando pgvector (vía RPC)
    // Usamos el cliente autenticado (el que tiene los tokens de sesión)
    const { data: documents, error } = await supabase.rpc('match_documents', {
      query_embedding: embedding,
      match_threshold: 0.15,
      match_count: 12
    })

    if (error) {
      console.error("Supabase RPC Error:", error)
      return NextResponse.json({ error: 'Error en la búsqueda semántica' }, { status: 500 })
    }

    const sources = documents || [];

    // 4. Integración Llama (Groq)
    let botContent = "";
    if (sources.length > 0) {
      let contextText = sources.map((s: any) => `Documento: ${s.filename}\nContenido: ${s.content}`).join("\n\n");
      // Limitar a ~24,000 caracteres (aprox 6000 tokens) para evitar 413 Payload Too Large
      if (contextText.length > 24000) {
        contextText = contextText.substring(0, 24000);
      }
      
      const groqResponse = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: "openai/gpt-oss-120b",
          messages: [
            {
              role: "system",
              content: `Eres NotarIA, un Abogado y Asistente Legal de grado notarial de élite. Tu objetivo es analizar los fragmentos recuperados de las escrituras y responder a la pregunta del abogado humano con absoluta precisión jurídica.

REGLAS DE FORMATO Y ESTILO:
1. Estructura tu respuesta como un reporte profesional, usando listas con viñetas y texto en **negritas** para clasificar a los sujetos (ej. **Vendedor / Fiduciario:**, **Compradores / Adquirentes:**, **Fideicomisarios:**).
2. Extrae y agrupa toda la información relevante de los sujetos (nombres completos, denominaciones sociales, nacionalidad, representación legal) basándote estrictamente en el contexto.
3. Habla con autoridad legal. NUNCA uses frases robóticas como "De acuerdo con los fragmentos proporcionados" o "El contexto dice". Simplemente entrega los hechos jurídicos como si tuvieras el expediente físico en tus manos.
4. Si la información está parcial, indícalo con sutileza y profesionalismo.
5. Al final de tu respuesta, siempre ofrece proactivamente proporcionar un dato relacionado (ej. "Si necesitas conocer los porcentajes de copropiedad o los datos del inmueble, házmelo saber.").

CONTEXTO DEL EXPEDIENTE NOTARIAL:
${contextText}`
            },
            {
              role: "user",
              content: query
            }
          ],
          temperature: 0.5,
          max_tokens: 2500
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const message = groqResponse.data.choices[0].message;
      
      if (message.reasoning) {
        botContent = `<think>\n${message.reasoning}\n</think>\n\n${message.content}`;
      } else {
        botContent = message.content;
      }
    } else {
      botContent = "He escaneado el expediente, pero no encontré cláusulas o fragmentos matemáticamente relacionados a tu pregunta. Por favor intenta plantearla con términos jurídicos distintos.";
    }

    // Deduplicar las fuentes por nombre de archivo para no mostrar 20 veces el mismo PDF
    const uniqueSources = Array.from(new Set(sources.map((s: any) => s.filename)))
      .map(filename => {
        return sources.find((s: any) => s.filename === filename);
      });

    return NextResponse.json({ 
      results: uniqueSources,
      answer: botContent
    })

  } catch (error: any) {
    console.error("Search API Error:", error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
