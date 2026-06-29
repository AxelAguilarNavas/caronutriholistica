# Sitio estático (quiz de evaluación) servido por nginx.
FROM nginx:1.27-alpine

# Configuración de nginx: sirve evaluacion.html como índice.
COPY docker/default.conf /etc/nginx/conf.d/default.conf

# Plantilla de configuración de la app + script que la renderiza al arrancar
# (inyecta WEBHOOK_URL desde la variable de entorno usando envsubst).
COPY config.template.js /etc/nginx/templates-app/config.template.js
COPY docker/40-render-config.sh /docker-entrypoint.d/40-render-config.sh
RUN chmod +x /docker-entrypoint.d/40-render-config.sh

# Contenido estático
COPY evaluacion.html /usr/share/nginx/html/evaluacion.html

EXPOSE 80
