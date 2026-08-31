FROM oven/bun:1-slim AS base
WORKDIR /app

# Copiar manifiesto de dependencias
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Copiar código
# `migrations/` no es opcional: sin él, una base creada con el esquema viejo
# (PKs BIGINT) nunca se convierte y schema.sql revienta al crear cualquier
# tabla que la referencie con una FK UUID.
COPY schema.sql ./
COPY migrations ./migrations
COPY src ./src

# Directorio de uploads con permisos para bun
RUN mkdir -p /app/uploads && chown -R bun:bun /app/uploads

# Usuario no-root
USER bun

ENV NODE_ENV=production
ENV PORT=5920

EXPOSE 5920

CMD ["bun", "src/server.ts"]
