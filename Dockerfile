FROM oven/bun:1.4-alpine

WORKDIR /app

# `zip` is shelled out to via Bun.$ for the archive step
RUN apk add --no-cache zip unzip

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

ENV PORT=4000
ENV HOSTNAME=127.0.0.1
ENV MAX_BODY_SIZE=524288000

EXPOSE 4000

CMD ["bun", "app.ts"]
