FROM denoland/deno:2.5.0

WORKDIR /app
COPY . .

# Install npm: dependencies used by Deno
RUN deno install --allow-scripts
RUN deno cache server.ts

EXPOSE 8000
CMD ["deno", "run", "--allow-net", "--allow-env", "--allow-read", "--allow-write", "server.ts"]
