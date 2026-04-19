FROM denoland/deno:2.2.12

WORKDIR /app

COPY . .

RUN deno cache server.ts

EXPOSE 8000

CMD ["run", "--allow-net", "--allow-env", "--allow-read", "--allow-write", "server.ts"]
