FROM oven/bun:1.3.14-alpine

WORKDIR /app

COPY . .

RUN bun install --frozen-lockfile

CMD ["bun", "run", "--filter=@affiliate-hub/api", "start"]
