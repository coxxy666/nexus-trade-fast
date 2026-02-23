FROM denoland/deno:2.5.0

WORKDIR /app

# Copy ONLY backend files (avoid frontend package.json deps)
COPY server.ts ./
COPY functions ./functions
COPY data ./data
COPY deno.json ./
COPY deno.lock ./

# Cache backend dependency graph only
RUN deno cache server.ts

EXPOSE 8000
CMD ["deno", "run", "--allow-net", "--allow-env", "--allow-read", "--allow-write", "server.ts"]
