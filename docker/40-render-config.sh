#!/bin/sh
# Renderiza config.js a partir de la plantilla, inyectando WEBHOOK_URL del entorno.
# Lo ejecuta el entrypoint oficial de nginx (scripts en /docker-entrypoint.d/).
set -e

: "${WEBHOOK_URL:=https://n8n.caronutriholistica.tech/webhook/fcfad32f-13a7-4148-b2db-e9af457ba77d}"
export WEBHOOK_URL

envsubst '${WEBHOOK_URL}' \
  < /etc/nginx/templates-app/config.template.js \
  > /usr/share/nginx/html/config.js

echo "[entrypoint] config.js generado con WEBHOOK_URL=${WEBHOOK_URL}"
