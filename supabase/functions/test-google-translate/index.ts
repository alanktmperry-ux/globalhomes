Deno.serve(async () => {
  const key = Deno.env.get("GOOGLE_TRANSLATE_API_KEY");
  if (!key) {
    return new Response(JSON.stringify({ error: "GOOGLE_TRANSLATE_API_KEY not set" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  const resp = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: "Hello world", target: "zh-CN" }),
    }
  );
  const text = await resp.text();
  return new Response(text, {
    status: resp.status,
    headers: { "Content-Type": "application/json" },
  });
});
