# Evaluación NutriBalance — Carolina Marino

Landing de **evaluación de síntomas** (quiz de varios pasos) que termina en la oferta del *Reto 21 Días*. Es un sitio **estático autocontenido** (`evaluacion.html`: HTML + CSS + JS inline, sin dependencias de runtime) que:

- Recibe la identidad del lead por **querystring** (`userId`, `sourcePlatform`, `channel`).
- Valida cada pregunta (obligatoriedad, mínimos, triaje de seguridad).
- Al guardar, hace **POST de todas las respuestas** al **webhook de n8n**.

## Estructura

```
.
├── evaluacion.html          # El quiz completo (sitio estático)
├── config.template.js       # Plantilla → config.js (se inyecta WEBHOOK_URL en runtime)
├── Dockerfile               # Imagen nginx que sirve el sitio
├── docker-compose.yml       # Despliegue (puerto + WEBHOOK_URL desde .env)
├── docker/
│   ├── default.conf         # nginx: sirve evaluacion.html como índice
│   └── 40-render-config.sh  # Entrypoint: envsubst → /config.js
├── scripts/
│   ├── render-config.mjs    # Genera config.js localmente desde .env
│   └── dev-server.mjs        # Servidor estático de desarrollo (sin deps)
├── .env.example             # Plantilla de variables (cópiala a .env)
├── package.json             # Scripts de dev y docker
└── README.md
```

> **No versionados** (en `.gitignore`): `.env`, `config.js`, `node_modules/`, y los documentos internos **`ChatBot.json`** y **`GUIA-CONEXION.md`** (contienen secretos — ver más abajo).

## Configuración

Copia la plantilla y ajusta valores:

```bash
cp .env.example .env
```

| Variable      | Descripción                                                        | Default |
|---------------|--------------------------------------------------------------------|---------|
| `PORT`        | Puerto del host donde se publica el sitio.                         | `8080`  |
| `WEBHOOK_URL` | Webhook de n8n que recibe las respuestas del quiz (POST).          | webhook de producción |

El `WEBHOOK_URL` se inyecta en `config.js` al arrancar; si el archivo se abre directamente sin `config.js`, el código usa el valor por defecto incrustado.

## Desarrollo local

Sin Docker (Node ≥ 18, sin dependencias externas):

```bash
npm install        # no instala paquetes externos; valida el proyecto
npm run dev        # genera config.js y levanta el server en http://localhost:8123
```

Prueba con identidad simulada:

```
http://localhost:8123/?userId=U123&sourcePlatform=manychat&channel=whatsapp
```

## Despliegue con Docker

```bash
docker compose up -d --build
```

El sitio queda en `http://localhost:${PORT}`. La imagen es nginx sirviendo el HTML; `WEBHOOK_URL` se toma de `.env`.

## Contrato del webhook (lo que envía el quiz)

Al pulsar el botón de guardado, el navegador hace `POST` (JSON) a `WEBHOOK_URL`:

```json
{
  "userId": "<querystring userId>",
  "sourcePlatform": "<querystring sourcePlatform>",
  "channel": "<querystring channel | 'whatsapp'>",
  "responses": [
    { "questionId": 1, "questionText": "Texto de la pregunta", "answers": ["Respuesta 1", "Respuesta 2"] }
  ]
}
```

- `responses` incluye **todas** las preguntas (incl. los 48 ítems del test de síntomas), con `questionId` secuencial.
- `answers` es siempre un array; las preguntas de selección múltiple envían varias respuestas.

> **CORS:** el POST sale desde el navegador hacia otro dominio. El nodo *Webhook* de n8n debe habilitar CORS (*Allowed Origins* = `*` o el dominio publicado). El envío es *fire-and-forget* y no bloquea la UI.

## Subir a GitHub

```bash
git remote add origin git@github.com:<usuario>/<repo>.git
git push -u origin main
```

Antes de subir, confirma que los secretos NO se incluyen:

```bash
git status --ignored   # ChatBot.json, GUIA-CONEXION.md y .env deben salir como ignored
```

## ⚠️ Seguridad

- **`GUIA-CONEXION.md`** y **`ChatBot.json`** están en `.gitignore` a propósito: contienen credenciales (contraseña SSH, API key de Dokploy, tokens de webhook/gateway, token de bot de Telegram, etc.). **No los subas** y considera **rotar** esos secretos.
- Mantén el `.env` fuera del control de versiones (ya está ignorado).
