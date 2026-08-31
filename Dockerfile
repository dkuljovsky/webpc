FROM oven/bun:1.4

WORKDIR /app

# `zip` is shelled out to via Bun.$ for the archive step
RUN apt-get update \
  && apt-get install -y --no-install-recommends zip unzip \
  && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

ENV PORT=4000
ENV HOSTNAME=0.0.0.0
ENV MAX_BODY_SIZE=524288000

EXPOSE 4000

CMD ["bun", "app.ts"]
