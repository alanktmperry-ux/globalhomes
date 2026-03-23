import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null,
      { headers: corsHeaders });
  }

  try {
    const openaiKey =
      Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return new Response(
        JSON.stringify({
          error: "OPENAI_API_KEY not configured"
        }),
        { status: 500, headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }}
      );
    }

    const audioBuffer =
      await req.arrayBuffer();

    if (!audioBuffer ||
      audioBuffer.byteLength === 0) {
      return new Response(
        JSON.stringify({
          error: "No audio received"
        }),
        { status: 400, headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }}
      );
    }

    const formData = new FormData();
    const audioBlob = new Blob(
      [audioBuffer],
      { type: "audio/webm" }
    );
    formData.append(
      "file", audioBlob, "audio.webm"
    );
    formData.append("model", "whisper-1");
    formData.append("language", "en");
    formData.append(
      "prompt",
      "Australian property search. Suburb names, bedroom count, price range, property type, features like pool garage ensuite solar."
    );

    const whisperRes = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
        },
        body: formData,
      }
    );

    if (!whisperRes.ok) {
      const err = await whisperRes.text();
      return new Response(
        JSON.stringify({
          error: "Transcription failed",
          detail: err
        }),
        { status: 500, headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }}
      );
    }

    const result = await whisperRes.json();
    const transcript =
      result.text?.trim() || "";

    return new Response(
      JSON.stringify({ transcript }),
      { headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }}
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error
          ? error.message
          : "Unknown error"
      }),
      { status: 500, headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }}
    );
  }
});
