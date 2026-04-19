FROM node:20-bullseye AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM denoland/deno:2.2.12

WORKDIR /app

COPY . .
COPY --from=deps /app/node_modules ./node_modules

RUN rm -f deno.lock
RUN deno cache --node-modules-dir=manual server.ts

EXPOSE 8000

CMD ["run", "--node-modules-dir=manual", "--allow-net", "--allow-env", "--allow-read", "--allow-write", "server.ts"]
