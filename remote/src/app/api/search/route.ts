import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import axios from 'axios'
import { pipeline, env } from '@xenova/transformers'

// Configuracion critica para Vercel Serverless
env.allowLocalModels = false;
env.useBrowserCache = false;
if (process.env.VERCEL) {
  env.cacheDir = '/tmp/xenova-cache';
}

// Mantiene el modelo en memoria entre ejecuciones (Cold Start mitigado)
let extractor: any = null;

// Mapa en memoria para Rate Limiting (Simple pero efectivo para Vercel Serverless)
const userRateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const limit = userRateLimits.get(userId);
  
  if (!limit || now > limit.resetAt) {
    userRateLimits.set(userId, { count: 1, resetAt: now + 60000 }); // 60 segundos
    return true;
  }
  
  if (limit.count >= 10) { // Límite: 10 peticiones por minuto por usuario
    return false;
  }
  
  limit.count++;
  return true;
}

// Sanitización de entradas (Regla 5 - Anti-Data-Leak)
function sanitizePrompt(prompt: string): string {
  let sanitized = prompt.replace(/\0/g, ''); // Eliminar caracteres nulos
  // Anonimizar emails y números largos que parezcan IDs (opcional pero recomendado)
  sanitized = sanitized.replace(/\b[\w.-]+@[\w.-]+\.\w+\b/g, '[EMAIL_REDACTED]');
  sanitized = sanitized.replace(/\b\d{8,12}\b/g, '[ID_REDACTED]');
  return sanitized;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // 1. Verificación de Autenticación RESTAURADA (Regla 5 - SSD)
    // NOTA: Se usa supabase.auth.getUser() que lee la cookie automáticamente.
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('[Auth] Intento de acceso no autorizado');
      return NextResponse.json({ error: 'No autorizado. Sesión inválida o ausente.' }, { status: 401 })
    }

    // 2. Rate Limiting
    if (!checkRateLimit(user.id)) {
      console.warn(`[RateLimit] Usuario ${user.email} excedió el límite de peticiones`);
      return NextResponse.json({ error: 'Demasiadas peticiones. Por favor espera un momento.' }, { status: 429 })
    }

    const body = await request.json()
    let { query } = body

    if (!query) {
      return NextResponse.json({ error: 'Query es requerido' }, { status: 400 })
    }

    // 3. Sanitizar entrada
    query = sanitizePrompt(query);
    
    // Log de auditoría seguro (Sin PII)
    const auditLog = {
      userId: user.id,
      timestamp: new Date().toISOString(),
      action: 'chat_query'
    };
    console.log('[Audit]', JSON.stringify(auditLog));

    let embedding: number[] = [];

    try {
      if (!extractor) {
        console.log('Descargando e inicializando modelo de embeddings en Vercel...');
        extractor = await pipeline('feature-extraction', 'Xenova/nomic-embed-text-v1.5', {
          quantized: true // 80MB para descarga ultrarrápida
        });
      }
      
      const output = await extractor(query, { pooling: 'mean', normalize: true });
      embedding = Array.from(output.data);

    } catch (e: any) {
      console.error("Error en Transformers.js:", e.message);
      if (e.message?.includes('timeout') || e.code === 'ETIMEDOUT') {
        return NextResponse.json(
          { error: 'El modelo se está descargando en Vercel. Por favor, reintenta en 10 segundos.' }, 
          { status: 503 }
        );
      }
      return NextResponse.json({ error: 'Fallo interno al generar el vector en Vercel' }, { status: 500 });
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
