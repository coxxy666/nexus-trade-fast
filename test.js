Deno.serve({ port: 8000, hostname: "127.0.0.1" }, (req) => {
  return new Response("Deno server is working!", {
    headers: { "Content-Type": "text/plain" }
  });
});
