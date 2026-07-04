# Panel de Nutrición — admin

Panel administrativo para la nutricionista: clientes (VIP, plan de nutrición), encuestas (estructura, respuestas, constructor) y catálogo de planes. Implementación del diseño de `Sistema Nutricion.dc.html` (handoff hifi) sobre el stack real del proyecto.

**Stack:** React 18 (Vite) + React Router · Express · PostgreSQL (base de negocio existente) · Docker.

## Estructura

```
admin/
├── server/            # API Express
│   ├── index.js       # app, login/logout/me, static del build
│   ├── routes.js      # /api/bootstrap + CRUD clientes/planes/encuestas/respuestas
│   ├── auth.js        # sesión con cookie HMAC firmada, validación de email
│   ├── db.js          # pool pg
│   └── migrate.js     # migración idempotente (corre al arrancar)
├── src/               # Frontend React
│   ├── components/    # AppSidebar (único, reutilizable), TopBar, AppLayout,
│   │                  # Switch, SubmissionModal, ConfirmModal, Toast
│   ├── pages/         # Login, Mensajería, Clientes (list/detail), Encuestas
│   │                  # (list/detail/respuestas/builder), Planes (list/detail/form)
│   ├── store.jsx      # estado global (datos + layout + modales)
│   └── styles.css     # design tokens del handoff
├── migration-admin.sql
├── Dockerfile         # build Vite + Express en una imagen
└── docker-compose.yml # servicio para Dokploy (red dokploy-network)
```

## Desarrollo local

```bash
cd admin
cp .env.example .env    # completar credenciales y PG*
npm install
npm run dev             # API en :3001 + Vite en :5173 (proxy /api)
```

## Producción (VPS / Dokploy)

1. La base es el Postgres dedicado existente (`carolina-marino-postgressql-dj2qmg`, db `PostgresSQL`). El contenedor del panel debe estar en la misma red Docker (`dokploy-network`) para resolver ese host.
2. Variables de entorno requeridas: `NUTRI_EMAIL`, `NUTRI_PASSWORD`, `SESSION_SECRET`, `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD` (ver `.env.example`; la contraseña está en Dokploy > carolina-marino-postgresql > Internal Credentials).
3. La migración (`migration-admin.sql`) es idempotente y **se aplica sola al arrancar el servidor**. No borra ni modifica datos existentes: agrega `clients.nutrition_plan_text` / `nutrition_plan_updated_at` y amplía dos constraints CHECK.
4. Deploy en Dokploy: nuevo servicio Compose apuntando a `admin/docker-compose.yml` (o Application con buildType dockerfile y `admin/Dockerfile`), más un domain con HTTPS hacia el puerto 3001.

## Decisiones de mapeo (diseño ↔ esquema real)

- **`plan_status`**: el diseño muestra Activo/Pausado/Cancelado; la tabla usa valores en inglés. El panel mapea Activo=`enrolled`, Pausado=`paused` (nuevo en el CHECK), Cancelado=`cancelled`, y además expone Interesado=`interested` y Completado=`completed` para no ocultar los estados que ya usa el bot.
- **`question_type`**: el constructor usa los 6 tipos del diseño (`short_text`, `long_text`, `single_choice`, `multiple_choice`, `yes_no`, `scale`). Los tipos legados del quiz (`checkbox`, `radio`, `select`, `text`, `severity`) siguen siendo válidos y se muestran con etiqueta en español; la encuesta del quiz tiene respuestas, por lo que su estructura queda bloqueada (regla de negocio del handoff).
- **`vip_set_by`**: la tabla solo admite `manual`/`automatic`; el panel guarda `manual` y muestra "Marcado VIP manualmente el …".
- **Reglas de negocio**: una encuesta con ≥1 respuesta no puede editarse ni eliminarse (validado en UI **y** en API con 409). El listado de clientes ordena VIP primero y luego alfabético con `localeCompare(..., 'es')`.
- **Mensajería** (`/mensajeria`, `GET /api/messages/latest` y `GET /api/clients/:id/messages`): lee la tabla `messages` (ver `scripts/migration-messages.sql`). Es de solo lectura a propósito — el textbox y el botón de enviar están deshabilitados en la UI porque el envío desde el panel todavía no está conectado al pipeline real de n8n/ManyChat. Desde ahí también se puede ver el perfil del cliente, sus respuestas de encuesta y activar/desactivar su VIP (mismo mecanismo que en `ClientDetail`).

## Autenticación

Única cuenta validada contra `NUTRI_EMAIL`/`NUTRI_PASSWORD` del `.env` (comparación timing-safe). Sesión: cookie httpOnly firmada con HMAC-SHA256 (`SESSION_SECRET`), expira a las 12 h. La validación de formato de correo del cliente replica la regex del handoff (borde rojo en vivo + mensaje bajo el formulario).
