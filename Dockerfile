FROM node:24-slim AS base
WORKDIR /app

# bun solo se usa para instalar desde bun.lock; el runtime es node (ver package.json)
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates unzip \
  && curl -fsSL https://bun.sh/install | bash \
  && apt-get purge -y curl unzip && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*
ENV PATH="/root/.bun/bin:${PATH}"

# Instalar dependencias (capa cacheable)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Código: el asset server de remix compila JSX/TS on-demand en cada request,
# así que el código fuente (no un build) debe estar presente en runtime.
COPY app ./app
COPY public ./public
COPY scripts ./scripts
COPY server.ts tsconfig.json ./
RUN CATALOGO_DESTINO=app/data/colonias.json node --import remix/node-tsx scripts/build-catalogo.ts

# Usuario no-root
RUN useradd --system --create-home --shell /usr/sbin/nologin remixapp \
  && chown -R remixapp:remixapp /app
USER remixapp

ENV NODE_ENV=production
ENV PORT=44100

EXPOSE 44100

CMD ["node", "--import", "remix/node-tsx", "server.ts"]
