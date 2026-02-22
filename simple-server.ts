// simple-server.ts - Test with explicit port
try {
  console.log(" Starting server on port 8000...");
  
  const server = Deno.serve({
    port: 8000,
    hostname: "127.0.0.1"
  }, (req) => {
    console.log(" Request received!");
    return new Response("Server is working correctly!", {
      headers: { "Content-Type": "text/plain" }
    });
  });

  console.log(" Server started successfully!");
  console.log(" Listening on: http://127.0.0.1:8000");
  console.log(" Also available: http://localhost:8000");
  
  // Keep running
  await server.finished;
  
} catch (error) {
  console.error(" Server failed:", error);
}
