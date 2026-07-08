# CLAUDE.md — Contexto del proyecto NutriBalance / Carolina Marino

## Panel administrativo (`admin/`)

Panel web para la nutricionista (mensajería de solo lectura por conversación, clientes con marcado VIP y plan de nutrición, encuestas con constructor y respuestas editables, catálogo de planes). React (Vite) + Express + el Postgres dedicado del negocio. Creado el 2026-07-04 a partir del handoff de diseño hifi (`Sistema Nutricion.dc.html`). Ver `admin/README.md` para estructura, deploy en Dokploy y decisiones de mapeo diseño↔esquema (plan_status con 'paused' nuevo, question_type ampliado con los 6 tipos del constructor). La migración `admin/migration-admin.sql` es idempotente y se aplica sola al arrancar el servidor; agrega `clients.nutrition_plan_text`/`nutrition_plan_updated_at`/`bot_enabled`. Login: única cuenta contra `NUTRI_EMAIL`/`NUTRI_PASSWORD` en `admin/.env` (gitignored).

**Toggle de bot por cliente (`clients.bot_enabled`, agregado 2026-07-06).** Permite pausar/reactivar el bot de IA para un cliente puntual desde `ClientDetail` y desde el header de `Mensajería`. A diferencia del resto del panel, esto **no pasa por n8n**: `admin/server/manychat.js` es una utilidad que habla directo con la API de ManyChat (`api.manychat.com`) usando su propio token (`MANYCHAT_API_TOKEN` en `admin/.env`, gitignored) para leer/escribir el custom field `BotStatus` — el mismo campo que ya leen `ChatBot.json` y `Send Messages` en n8n (ver `context-test-docs/WEBHOOKS.md` §9). Fue decisión explícita del usuario ir directo en vez de por el webhook `ManyChat - Toggle BotStatus` que ya existía. Esto duplica el secreto de ManyChat en dos sistemas (n8n tiene su propia credencial `Manychat API`, id `fMntGTvhDGuMASNq`) — si el token se rota, hay que actualizarlo en ambos lados. Al abrir la ficha de un cliente se reconcilia automáticamente `bot_enabled` con el valor real de ManyChat (`POST /api/clients/:id/bot-status/sync`), por si cambió por fuera del panel; no hay reconciliación en el `/api/bootstrap` completo (evita N requests a ManyChat en cada carga).

**Módulo de Mensajería (`/mensajeria`, agregado 2026-07-05).** Muestra la conversación de WhatsApp de cada cliente (tabla `messages`, ver `scripts/migration-messages.sql`), su perfil, sus respuestas de encuesta, y el switch para activar/desactivar VIP — todo reutilizando la misma lógica que `ClientDetail`. El textbox y el botón de enviar están deshabilitados a propósito: el envío de mensajes desde el panel todavía no está conectado al pipeline de n8n/ManyChat, queda como trabajo futuro. Desde 2026-07-05 la tabla `messages` se llena sola con tráfico real: `ChatBot.json` guarda cada mensaje entrante (`Save incoming message`) y el workflow `Send Messages` cada saliente (`Save outgoing message`), ver `context-test-docs/WEBHOOKS.md` §6 y §8 — solo falta el backfill del histórico viejo que vivía en la Data Table de n8n. Aparte de esto, el usuario bloqueó deliberadamente el envío real de mensajes a ManyChat/WhatsApp desde el pipeline de n8n mientras el MVP sigue en pruebas (no confundir con el botón deshabilitado del panel, que es un motivo distinto) — no reactivar ese bloqueo salvo que el usuario lo pida.

**Desplegado el 2026-07-04.** Servicio Dokploy `admin-panel` (composeId `KWv607Av_QUnEDMQZWBUV`) en el proyecto "Carolina Marino", sourceType `github` (repo `AxelAguilarNavas/caronutriholistica`, branch `main`, composePath `./admin/docker-compose.yml`) — el código de `admin/` está commiteado en el repo (sin `.env`/secretos) porque Dokploy necesita el `Dockerfile` y el resto del build context para construir la imagen. Domain configurado: `admin.caronutriholistica.tech` → puerto 3001, HTTPS (Let's Encrypt). Verificado end-to-end: login con `NUTRI_EMAIL`/`NUTRI_PASSWORD` reales, `/api/bootstrap` devuelve las 84 preguntas + 6 submissions reales de la encuesta del quiz, y `PUT /api/surveys/:id` devuelve 409 al intentar editar la estructura de una encuesta con respuestas.

> ⚠️ **Pendiente del usuario:** falta crear el registro DNS A de `admin.caronutriholistica.tech` → `2.25.66.208` en el proveedor de DNS del dominio. Dokploy/Traefik ya tiene el domain configurado con `certificateType: letsencrypt`, pero Let's Encrypt no puede emitir el certificado hasta que el DNS resuelva públicamente (verificado con `curl --resolve` contra la IP: el servicio responde 200 correctamente, solo falta el DNS + certificado).

## Documentos de contexto

Los documentos de referencia del proyecto están en la carpeta `context-test-docs/`:

### [`context-test-docs/PROYECTO.md`](context-test-docs/PROYECTO.md)
Descripción técnica completa del proyecto. Consultar cuando necesites entender:
- Arquitectura general y stack (HTML · Docker · n8n · PostgreSQL · OpenClaw)
- Estructura del frontend `evaluacion.html`: pasos del quiz, scoring de síntomas, lead scoring, payload del webhook
- Esquema completo de la base de datos (tablas, columnas, trigger, índices)
- Resumen de alto nivel de los workflows de n8n (para el detalle actualizado, ver `WEBHOOKS.md` y `ARQUITECTURA-AGENTES.md`)
- Seed de datos iniciales: planes, survey, secciones, 84 preguntas

### [`context-test-docs/WEBHOOKS.md`](context-test-docs/WEBHOOKS.md)
Contrato de request/response de cada webhook activo (ManyChat→ChatBot, n8n→Coco, quiz→Save Responses, Encuesta config, Save VIP User, Send Messages, n8n→Nora/VIP, y ManyChat - Toggle BotStatus). Consultar cuando necesites el formato exacto de un payload o depurar por qué un webhook no responde como se espera.

### [`context-test-docs/ARQUITECTURA-AGENTES.md`](context-test-docs/ARQUITECTURA-AGENTES.md)
Descripción de los agentes de OpenClaw (Coco, Nora/VIP, main), sus skills y funciones verificadas. Nora (VIP) ya tiene webhook propio y está conectada a tráfico real vía enrutamiento por `is_vip` en `ChatBot.json` (verificado end-to-end el 2026-07-04). Consultar cuando necesites entender el rol, límites o estado de un agente.

### [`context-test-docs/GUIA-CONEXION.md`](context-test-docs/GUIA-CONEXION.md)
Credenciales e instrucciones de acceso a la infraestructura. Consultar cuando necesites:
- Conectarte por SSH al VPS (`root@2.25.66.208`)
- Usar la API de Dokploy (panel de control, IDs de proyecto/entorno/compose)
- Ejecutar comandos en el contenedor PostgreSQL dedicado
- Acceder al panel o CLI de OpenClaw
- Llamar al webhook de Coco o reiniciar el servidor sin redeploy
- Referencias rápidas a los webhooks activos de n8n

> ⚠️ `GUIA-CONEXION.md` contiene secretos (contraseñas, tokens, API keys). Está en `.gitignore` y no debe subirse a GitHub.

### [`context-test-docs/n8n-workflows/`](context-test-docs/n8n-workflows/)
Exportes JSON de los workflows de n8n, re-descargados de la API el 2026-07-05 (fuente de verdad — más recientes que `ChatBot.json`/`manychat-bot-toggle-*.json` en la raíz del repo o en `scripts/`, que son copias de trabajo viejas). Consultar cuando necesites entender la lógica exacta de nodos, credenciales o conexiones (más detallado que el resumen de `PROYECTO.md`):

- **[`evaluacion/`](context-test-docs/n8n-workflows/evaluacion/)** — flujo del quiz NutriBalance
  - `Save-Responses.json` — webhook que recibe las respuestas del quiz, valida campos y opciones contra la config de la encuesta, hace UPSERT de `clients` e INSERT de `quiz_submissions`, y llama a `Send Messages` para notificar a Coco
  - `Encuesta-Obtener-configuracion.json` — webhook que devuelve la estructura de preguntas/opciones de una encuesta desde Postgres (usado por `Save-Responses` para validar)
- **[`coco-chatbot/`](context-test-docs/n8n-workflows/coco-chatbot/)** — agentes conversacionales Coco y Nora
  - `ChatBot.json` — recepción de mensajes de ManyChat (WhatsApp), normalización de teléfono, blacklist, buffer/dedup de mensajes en Redis, UPSERT de `clients`, **enrutamiento por `is_vip`** hacia Coco o Nora (nodo `IF: Es VIP`), detección de la marca `[[PAGO_VALIDADO]]` y disparo del webhook `Save VIP User`. Desde 2026-07-05 también guarda cada mensaje entrante en la tabla Postgres `messages` (nodo `Save incoming message`) — se retiró el logging viejo a Notion (`Notion Append Inbound`/`Notion Find Page`/`Format for Notion`), ya no forma parte del pipeline.
  - `Save-VIP-User.json` — webhook que Coco dispara al validar un comprobante de pago; marca al cliente como `is_vip=true` en Postgres (operación `upsert`, no `update` — evita una condición de carrera con el UPSERT de `ChatBot.json`)
  - `ManyChat-Toggle-BotStatus.json` — webhook nuevo (creado por el usuario, no por esta sesión) para pausar/reactivar el bot de un subscriber vía el custom field `BotStatus` de ManyChat — ver `WEBHOOKS.md` §9
  - `Coco-Agent-dev.json` — **copia de desarrollo/pruebas** de `ChatBot.json` (inactiva, sin webhook, se dispara manualmente desde un nodo `Set` en el editor de n8n). No forma parte del pipeline de producción; se conserva como referencia de una versión anterior sin la lógica de pago/VIP.
- **[`Send-Messages.json`](context-test-docs/n8n-workflows/Send-Messages.json)** — webhook centralizado compartido por `ChatBot` y `Save Responses` para enviar las burbujas de respuesta (de Coco o de Nora) a WhatsApp vía ManyChat.

Workflows activos en n8n (verificado vía API el 2026-07-05): `ChatBot`, `Encuesta: Obtener configuración`, `Save Responses`, `Save VIP User`, `Send Messages` (tenía 4 bugs de referencias/config + un bug de conexión rota (`Split Out → Loop Over Items1`, perdía cualquier respuesta de 2+ mensajes en silencio) — este último **reapareció el 2026-07-05** tras una edición del workflow en el editor de n8n y se corrigió de nuevo; ver `WEBHOOKS.md` §6 para el patrón recurrente y la regla de "siempre re-verificar con una ejecución real tras editar"), `ManyChat - Toggle BotStatus` (creado por el usuario). `Coco Agent` (el dev/test) está inactivo. ⚠️ El envío real de mensajes a ManyChat/WhatsApp está **bloqueado deliberadamente por el usuario** desde 2026-07-05 mientras el MVP sigue en pruebas — no reactivarlo, ver `WEBHOOKS.md` §6.

> ⚠️ `ChatBot.json` y `Coco-Agent-dev.json` (las copias en `n8n-workflows/`) contienen tokens/config con datos sensibles del entorno real. Están en `.gitignore` y no deben subirse a GitHub, igual que sus copias en la raíz del repo.

## Archivos ignorados por git (no subir)

- `context-test-docs/` — carpeta completa (incluye `GUIA-CONEXION.md`, `PROYECTO.md`, `n8n-workflows/`)
- `.env` — variables de entorno con secretos
- `config.js` — generado en runtime
- `ChatBot.json` — tokens de Telegram y configuración de ManyChat
