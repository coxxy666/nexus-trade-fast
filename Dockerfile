FROM denoland/deno:2.2.12

WORKDIR /app
COPY . .

EXPOSE 8000

CMD ["run", "--allow-net", "--allow-env", "--allow-read", "--allow-write", "server.ts"]
