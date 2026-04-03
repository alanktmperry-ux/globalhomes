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

    const lang = req.headers.get("X-Language") || "en";

    const whisperPrompts: Record<string, string> = {
      en: "Australian property search. Suburb names, bedroom count, price range, property type, features like pool garage ensuite solar.",
      zh: "澳大利亚房产搜索。郊区名称，卧室数量，价格范围，房产类型，特征如游泳池、车库、卫浴套间、太阳能。",
      ko: "호주 부동산 검색. 교외 이름, 침실 수, 가격 범위, 부동산 유형, 수영장 차고 욕실 태양열 등의 특징.",
      ms: "Carian hartanah Australia. Nama kawasan, bilangan bilik tidur, julat harga, jenis hartanah, ciri-ciri seperti kolam renang garaj bilik mandi suria.",
      es: "Búsqueda de propiedades australianas. Nombres de suburbios, número de dormitorios, rango de precios, tipo de propiedad, características como piscina garaje baño solar.",
      ar: "البحث عن العقارات الأسترالية. أسماء الضواحي، عدد غرف النوم، نطاق السعر، نوع العقار، مميزات مثل حمام سباحة مرآب حمام طاقة شمسية.",
      hi: "ऑस्ट्रेलियाई संपत्ति खोज। उपनगर के नाम, शयनकक्ष की संख्या, मूल्य सीमा, संपत्ति का प्रकार, पूल गैरेज एनसुइट सोलर जैसी विशेषताएं।",
      fr: "Recherche immobilière australienne. Noms de banlieues, nombre de chambres, fourchette de prix, type de propriété, caractéristiques comme piscine garage salle de bain solaire.",
      pt: "Pesquisa de imóveis australianos. Nomes de bairros, número de quartos, faixa de preço, tipo de imóvel, características como piscina garagem banheiro solar.",
      bn: "অস্ট্রেলিয়ান সম্পত্তি অনুসন্ধান। শহরতলীর নাম, শোবার ঘরের সংখ্যা, মূল্য পরিসীমা, সম্পত্তির ধরন, পুল গ্যারেজ এনস্যুট সোলার বৈশিষ্ট্য।",
      ru: "Поиск недвижимости в Австралии. Названия пригородов, количество спален, ценовой диапазон, тип недвижимости, особенности: бассейн гараж ванная солнечные панели.",
      ja: "オーストラリアの不動産検索。郊外の名前、寝室数、価格帯、物件タイプ、プール・ガレージ・バスルーム・ソーラーなどの特徴。",
    };

    const formData = new FormData();
    const audioBlob = new Blob(
      [audioBuffer],
      { type: "audio/webm" }
    );
    formData.append(
      "file", audioBlob, "audio.webm"
    );
    formData.append("model", "whisper-1");
    formData.append("language", lang);
    formData.append(
      "prompt",
      whisperPrompts[lang] ?? whisperPrompts["en"]
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
