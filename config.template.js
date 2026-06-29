// Plantilla procesada por envsubst en el arranque del contenedor (ver docker/40-render-config.sh).
// Genera /usr/share/nginx/html/config.js con el valor de WEBHOOK_URL del entorno.
window.APP_CONFIG = { WEBHOOK_URL: "${WEBHOOK_URL}" };
