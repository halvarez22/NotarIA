import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import axios from 'axios'
// Mantiene el modelo en memoria entre ejecuciones (Cold Start mitigado)
let extractor: any = null;
let transformers: any = null;

// Mapa en memoria para Rate Limiting
const userRateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const limit = userRateLimits.get(userId);
  if (!limit || now > limit.resetAt) {
    userRateLimits.set(userId, { count: 1, resetAt: now + 60000 });
    return true;
  }
  if (limit.count >= 10) return false;
  limit.count++;
  return true;
}

function sanitizePrompt(prompt: string): string {
  let sanitized = prompt.replace(/\0/g, '');
  sanitized = sanitized.replace(/\b[\w.-]+@[\w.-]+\.\w+\b/g, '[EMAIL_REDACTED]');
  sanitized = sanitized.replace(/\b\d{8,12}\b/g, '[ID_REDACTED]');
  return sanitized;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
    }

    if (!checkRateLimit(user.id)) {
      return NextResponse.json({ error: 'Demasiadas peticiones.' }, { status: 429 })
    }

    const body = await request.json()
    let { query } = body
    if (!query) return NextResponse.json({ error: 'Query requerido' }, { status: 400 })

    query = sanitizePrompt(query);
    console.log('[Audit]', JSON.stringify({ userId: user.id, timestamp: new Date().toISOString(), action: 'chat_query' }));

    let embedding: number[] = [];

    // ESTRATEGIA DE FALLBACK (Auditoría: Pregunta 3)
    try {
      if (!transformers) {
        console.log('Importando Transformers.js dinámicamente para prevenir Vercel Boot Crash...');
        // Dynamic import previene que Vercel muera al arrancar si falta el binario .so
        transformers = await import('@xenova/transformers');
        
        // Configuracion critica para Vercel Serverless con WASM
        transformers.env.allowLocalModels = false;
        transformers.env.useBrowserCache = false;
        if (process.env.VERCEL) {
          transformers.env.cacheDir = '/tmp/xenova-cache';
          transformers.env.backends.onnx.wasm.proxy = true;
          transformers.env.backends.onnx.wasm.numThreads = 1;
        }
      }

      if (!extractor) {
        console.log('Inicializando WASM Embedding Engine en Vercel...');
        extractor = await transformers.pipeline('feature-extraction', 'Xenova/nomic-embed-text-v1.5', {
          quantized: true,
        });
      }
      
      const output = await extractor(query, { pooling: 'mean', normalize: true });
      embedding = Array.from(output.data);

    } catch (e: any) {
      console.warn("WASM Engine falló, ejecutando PLAN DE CONTINGENCIA (HF API)...", e.message);
      
      // Fallback a Hugging Face Inference API
      const hfResponse = await axios.post(
        'https://api-inference.huggingface.co/models/nomic-ai/nomic-embed-text-v1.5',
        { inputs: query },
        { headers: { 'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}` } }
      );
      
      if (!hfResponse.data || !Array.isArray(hfResponse.data)) {
         throw new Error("El Fallback de HuggingFace también falló.");
      }
      // Nomic API devuelve un arreglo de arreglos [[0.1, 0.2, ...]] o [0.1, 0.2, ...]
      embedding = Array.isArray(hfResponse.data[0]) ? hfResponse.data[0] : hfResponse.data;
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
