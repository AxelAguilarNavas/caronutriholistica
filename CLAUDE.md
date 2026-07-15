# CLAUDE.md — Contexto del proyecto NutriBalance / Carolina Marino

> Historial de cambios: ver `context-test-docs/CHANGELOG.md`. Este archivo describe solo el estado actual.

## Panel administrativo (`admin/`)

Panel web para la nutricionista: mensajería de solo lectura por conversación, clientes con marcado VIP / plan de nutrición / toggle de bot, encuestas con constructor y respuestas editables, catálogo de planes. Stack: React (Vite) + Express + el Postgres dedicado del negocio. Ver `admin/README.md` para estructura, deploy en Dokploy y el mapeo diseño↔esquema (`plan_status` con `'paused'`, `question_type` ampliado con los 6 tipos del constructor). La migración `admin/migration-admin.sql` es idempotente y se aplica sola al arrancar el servidor; agrega `clients.nutrition_plan_text`/`nutrition_plan_updated_at`/`bot_enabled`. Login: única cuenta contra `NUTRI_EMAIL`/`NUTRI_PASSWORD` en `admin/.env` (gitignored). Desplegado en `admin.caronutriholistica.tech` (servicio Dokploy `admin-panel`, composeId `KWv607Av_QUnEDMQZWBUV`, sourceType `github`, composePath `./admin/docker-compose.yml`, puerto 3001, HTTPS) — el código de `admin/` está commiteado (sin `.env`/secretos) porque Dokploy necesita el build context.

**Toggle de bot por cliente (`clients.bot_enabled`).** Permite pausar/reactivar el bot de IA para un cliente puntual desde `ClientDetail` y desde el header de Mensajería. A diferencia del resto del panel, esto **no pasa por n8n**: `admin/server/manychat.js` habla directo con la API de ManyChat (`api.manychat.com`) usando su propio token (`MANYCHAT_API_TOKEN` en `admin/.env`, gitignored) para leer/escribir el custom field `BotStatus` — el mismo que leen `ChatBot.json` y `Send Messages` (ver `context-test-docs/WEBHOOKS.md` §9). Esto **duplica el secreto de ManyChat en dos sistemas** (n8n tiene su credencial `Manychat API`, id `fMntGTvhDGuMASNq`): si el token se rota, hay que actualizarlo en ambos lados. Al abrir la ficha de un cliente se reconcilia `bot_enabled` con el valor real de ManyChat (`POST /api/clients/:id/bot-status/sync`); no hay reconciliación en el `/api/bootstrap` completo (evita N requests a ManyChat en cada carga).

**Visualizador público de encuestas (`/encuesta`).** Página pública sin login dentro del panel admin para llenar cualquier encuesta creada en el constructor — **no aplica a `nutribalance-v1`**, que conserva su flujo dedicado (`evaluacion.html` en el dominio raíz + pipeline de n8n/Coco; no tocar). URL con todo por querystring: `/encuesta?slug=...&userId=...&sourcePlatform=...` (+`channel` opcional); **si falta cualquiera de los 3 obligatorios la página no renderiza ni llama al API**. Backend: `admin/server/publicRoutes.js` (`GET/POST /api/public/surveys/:slug[...]`), montado sin auth antes del router protegido; valida solo las preguntas obligatorias visibles (recalcula condicionales server-side) y guarda directo en Postgres — `raw_payload` usa la clave `answers` (no `responses`) a propósito para que el trigger `trg_normalize_answers` no duplique filas; `submission_answers` se inserta manualmente con `question_id`/`option_id` reales (una fila por opción en multiple_choice). `client_id` es solo lookup por `user_id` (nunca crea clientes). Compartir: `surveyShareLink()` en `admin/src/utils.js` arma el link según encuesta (nutribalance-v1 → dominio raíz, resto → `/encuesta?...`); botón "Compartir" en `SurveyDetail` y `ShareSurveyButton` (menú de encuestas activas) en `ClientDetail`, header del chat de Mensajería y su drawer de perfil.

**Módulo de Mensajería (`/mensajeria`).** Muestra la conversación de WhatsApp de cada cliente (tabla `messages`, ver `scripts/migration-messages.sql`), su perfil, sus respuestas de encuesta, y el switch VIP — reutilizando la lógica de `ClientDetail`. El textbox y el botón de enviar están deshabilitados a propósito: el envío de mensajes desde el panel todavía no está conectado al pipeline de n8n/ManyChat (trabajo futuro). La tabla `messages` se llena sola con tráfico real en ambas direcciones: `ChatBot` guarda cada mensaje entrante (`Save incoming message`) y `Send Messages` cada saliente (`Save outgoing message`), ver `context-test-docs/WEBHOOKS.md` §6 y §8 — solo falta el backfill del histórico viejo que vivía en la Data Table de n8n.

## Pipeline conversacional (n8n)

**Gate de blacklist/whitelist en `ChatBot`.** El pipeline filtra el teléfono entrante en este orden: `Normalizar Telefono` → `Buscar en Blacklist` → `Its a Valid Phone?` → `Buscar en Whitelist` → `En Whitelist?` → `Restaurar Contexto` → resto del flujo. Dos data tables de n8n:
- `Coco Blacklist` (id `H2h2pGeciDBJuXgR`, col `phone10`) — **permanente**: números que **nunca** reciben respuesta.
- `Coco WhiteList` (id `hPWCNMwFsSNzSRFv`, cols `phone`/`label`/`added_by`/`added_at`) — **gate temporal de pruebas**: solo los teléfonos presentes reciben respuesta mientras el agente está en pruebas. `phone` guarda los **últimos 10 dígitos** (`phone10`), calculados a partir de `whatsapp_phone` (NO el `subscriber_id`/`id` de ManyChat; la fuente autoritativa del teléfono es `clients.phone`). ⚠️ Es un gate **restrictivo**: con la whitelist vacía el bot no responde a NADIE. Para desactivarlo al terminar las pruebas: reconectar `Its a Valid Phone?` (rama true) directo a `Restaurar Contexto` y borrar los nodos `Buscar en Whitelist` y `En Whitelist?`.

**Envío de mensajes.** El envío real a WhatsApp vía ManyChat (workflow `Send Messages`, nodo `Send Burbuja`) está **activo**. ⚠️ La conexión `Split Out → Send Burbuja` de `Send Messages` es frágil: se rompe al editar el workflow en el editor de n8n y hace que las respuestas de 2+ mensajes se pierdan en silencio — **re-verificar siempre con una ejecución real tras editar** ese workflow (ver `context-test-docs/WEBHOOKS.md` §6).

**Enrutamiento VIP.** `ChatBot` enruta por `is_vip` (nodo `IF: Es VIP`) hacia Nora (`HTTP Request Nora`, agente VIP con webhook propio) o Coco (`HTTP Request Coco`). Ver `context-test-docs/ARQUITECTURA-AGENTES.md`.

## Documentos de contexto

Los documentos de referencia del proyecto están en `context-test-docs/` (carpeta gitignored, no subir a GitHub). Todos describen el estado actual; el historial vive en `context-test-docs/CHANGELOG.md`.

### [`context-test-docs/PROYECTO.md`](context-test-docs/PROYECTO.md)
Descripción técnica completa: arquitectura y stack (HTML · Docker · n8n · PostgreSQL · OpenClaw), estructura del frontend `evaluacion.html` (pasos del quiz, scoring, lead scoring, payload del webhook), esquema completo de la base de datos, resumen de los workflows de n8n, y el seed de datos iniciales.

### [`context-test-docs/WEBHOOKS.md`](context-test-docs/WEBHOOKS.md)
Contrato de request/response de cada webhook activo (ManyChat→ChatBot, n8n→Coco, quiz→Save Responses, Encuesta config, Save VIP User, Send Messages, n8n→Nora/VIP, y ManyChat - Toggle BotStatus).

### [`context-test-docs/ARQUITECTURA-AGENTES.md`](context-test-docs/ARQUITECTURA-AGENTES.md)
Los agentes de OpenClaw (Coco, Nora/VIP, main), sus skills y funciones. Nora (VIP) tiene webhook propio y está conectada a tráfico real vía enrutamiento por `is_vip` en `ChatBot`.

### [`context-test-docs/GUIA-CONEXION.md`](context-test-docs/GUIA-CONEXION.md)
Credenciales e instrucciones de acceso a la infraestructura (SSH al VPS, API de Dokploy, Postgres, OpenClaw, API/CLI de n8n, webhooks). ⚠️ Contiene secretos; está en `.gitignore` y no debe subirse a GitHub.

### [`context-test-docs/n8n-workflows/`](context-test-docs/n8n-workflows/)
Exportes JSON de los workflows de n8n (fuente de verdad, re-descargados de la API). Workflows activos: `ChatBot` (`zKyTDmgZfGyvwjts`), `Encuesta: Obtener configuración` (`Q3Snwr0SZf5K2lY5`), `Save Responses` (`a4KwRr73CWcbpL3i`), `Save VIP User` (`5gWOlUXXwo63RIrW`), `Send Messages` (`EzFR5idvZUT25Lsu`), `ManyChat - Toggle BotStatus` (`dibwJgwgsGZvp85G`). Inactivo: `Coco Agent` (`vgVmNNxSVwkNQP3x`), copia dev/test de `ChatBot` que se dispara manualmente desde el editor (no es parte del pipeline de producción).

- **`evaluacion/`** — `Save-Responses.json` (webhook del quiz: valida contra la config, **busca** el `clients` existente por `user_id` — no lo crea —, INSERT de `quiz_submissions`, llama a `Send Messages`) y `Encuesta-Obtener-configuracion.json` (devuelve la estructura de preguntas/opciones desde Postgres).
- **`coco-chatbot/`** — `ChatBot.json` (recepción ManyChat, normalización/blacklist/whitelist, buffer/dedup en Redis, UPSERT de `clients`, enrutamiento por `is_vip`, detección de `[[PAGO_VALIDADO]]` y disparo de `Save VIP User`, guardado de entrantes en `messages`), `Save-VIP-User.json` (marca `is_vip=true`, operación `upsert`), `ManyChat-Toggle-BotStatus.json` (pausa/reactiva el bot vía el custom field `BotStatus`) y `Coco-Agent-dev.json` (copia dev/test inactiva).
- **`Send-Messages.json`** — webhook centralizado compartido por `ChatBot` y `Save Responses` para enviar las burbujas de respuesta (Coco o Nora) a WhatsApp vía ManyChat.

> ⚠️ `ChatBot.json`, `Coco-Agent-dev.json` y `GUIA-CONEXION.md` contienen tokens/config sensibles del entorno real. Están en `.gitignore`.

## Archivos ignorados por git (no subir)

- `context-test-docs/` — carpeta completa (incluye `GUIA-CONEXION.md`, `PROYECTO.md`, `CHANGELOG.md`, `n8n-workflows/`)
- `.env` — variables de entorno con secretos
- `config.js` — generado en runtime
- `ChatBot.json` — tokens de Telegram y configuración de ManyChat
