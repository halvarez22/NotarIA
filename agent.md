# Reglas Persistentes del Proyecto: Agente Digestor de Documentos IA

## REGLA INAMOVIBLE 1: APO (Auditoría Profunda Obligatoria) y Planning Mode Estricto
Quedan estrictamente prohibidos los "hotfixes" ciegos o rápidos. **NINGÚN CAMBIO ES TRIVIAL.** Antes de realizar CUALQUIER modificación a una lógica existente, el agente DEBE obligatoriamente:
1. **Mapeo del Grafo de Impacto Global:** Analizar toda la cadena de afectación: Componentes UI -> Servicios de Procesamiento -> Integración LLM. 
2. **Identificación Previa de Efectos Secundarios (Zero Regressions):** Documentar qué otros componentes o tipos se verán alterados debido al cambio.
3. **Planning Mode Multi-Archivo:** Presentar un Plan de Implementación formal (`implementation_plan.md`) que detalle el diagnóstico técnico global antes de modificar código.

## REGLA INAMOVIBLE 2: HRU (Cero Hardcoding, Cero Regresiones, Universalidad Total)
- **Cero Hardcoding:** No se permite codificar valores fijos, promts base ni configuraciones. Toda lógica debe ser parametrizada y dinámica.
- **Cero Regresiones:** El procesamiento de documentos debe avanzar bajo la premisa de no romper funcionalidades existentes.
- **Universalidad Total:** La arquitectura y el flujo de orquestación deben manejar archivos de texto, imágenes y PDFs bajo el mismo contrato de interfaz y experiencia de usuario.

## REGLA INAMOVIBLE 3: Arquitectura Anti-God-Component y Micro-Servicios Frontend
- **Delegación Obligatoria:** Todo motor lógico (ej. extracción de OCR, orquestador de prompts) DEBE construirse en un servicio independiente e inyectarse en los componentes. Los componentes de React deben limitarse exclusivamente a "decidir a quién llamar" y renderizar.
- **Cero Tolerancia a Archivos Monstruo:** Si un componente de UI supera en complejidad su propósito presentacional, debe alertarse al usuario para delegarlo en un Custom Hook o servicio modular.

## REGLA INAMOVIBLE 4: U-First (Usabilidad y Experiencia Fantástica)
- **Empatía Técnica:** Está estrictamente prohibido diseñar flujos que bloqueen al usuario. Toda interacción debe ser guiada.
- **Cero Callejones sin Salida:** Siempre proveer botones claros ("Volver", "Reintentar") si ocurre un error con el modelo de Gemini.
- **Efecto WOW:** Uso intensivo de Tailwind para lograr transiciones, feedback visual constante y una interfaz altamente profesional.

## REGLA INAMOVIBLE 5: SSD (Seguridad por Diseño - ISO/IEC 27034-1)
La refactorización debe alinearse estrictamente al estándar internacional de seguridad:
- **Sanitización Dinámica de Contexto:** Antes de enviar el contenido del documento a la API de Gemini, el sistema debe limpiar caracteres nulos, validar codificaciones y (si es necesario) anonimizar PII, asumiendo un entorno "Zero Trust".
- **Aislamiento de Cargas (Anti-Data-Leak):** Garantizar la protección de la API Key (usando `import.meta.env`) de forma que nunca se filtre en bundles de cliente de forma insegura y separar la capa de subida de archivos de la capa de envío al LLM.
- **Validación de Entradas en Servicios:** Cada módulo (`fileProcessor`, `geminiService`) debe validar de forma independiente el origen e integridad de los datos (`File`, buffers de texto) que recibe.

## REGLA INAMOVIBLE 6: SQA (Software Quality Assurance) y Estrangulamiento Seguro
Para mitigar riesgos operativos al refactorizar o reescribir módulos corruptos:
- **Mapeo de Dependencias (ARO):** No se permite migrar código sin mapear y documentar su firma y efectos secundarios en la UI.
- **Refactorización por Capas (Strangler Fig Pattern):** Cualquier cambio estructural debe ejecutarse componente por componente. No hay refactors masivos simultáneos sin verificar que la capa inferior funcione (ej. probar el servicio de Gemini independiente antes de conectarlo a la UI).
- **Idempotencia de Peticiones:** Las llamadas a Gemini en el frontend deben bloquear re-envíos múltiples de la misma solicitud (debouncing/bloqueo de UI) para prevenir consumos de tokens duplicados o estados de carrera.

## REGLA INAMOVIBLE 7: MCP (Model Context Protocol) Readiness y Context Economy
Aunque el frontend llame directamente a una API cloud (Gemini), la arquitectura debe asimilar los principios de MCP para una escalabilidad óptima:
- **Abstracción de Herramientas (Tooling):** El procesamiento de PDFs y el OCR en Canvas no deben estar fuertemente acoplados a la UI, sino encapsularse como "Tools" o "Resources" estandarizados, emulando la filosofía de un servidor MCP, facilitando su eventual migración a un backend real.
- **Optimización de Contexto (Context Economy):** La ventana de contexto de Gemini es finita. El frontend debe actuar como un regulador inteligente (similar a MCP), empaquetando estrictamente el historial relevante o limitando el número de imágenes procesadas por PDF (ej. solo procesar las primeras X páginas) para evitar latencias extremas y sobrecostos por tokens.
- **Modularidad de Prompts:** Todo el "system prompt" o contexto inicial debe inyectarse a través de un canal centralizado, preparando el terreno para múltiples agentes.

## REGLA INAMOVIBLE 8: Bucle de Descubrimiento de Código y Cero Parches
- Ante un problema, el agente ejecutará una estrategia de "Mapear Todo antes de Actuar", inspeccionando proactivamente `types.ts`, y dependencias en el sistema de archivos.
- Planes de Implementación Consolidados y Definitivos.
- Si se descubre un efecto colateral, se debe detener la escritura y solicitar nueva aprobación (Cero parches aislados iterativos).
