// One-shot: re-trigger generate-translations for listings stuck at pending.
const IDS = [
  'ea0c5c52-ed62-4788-942f-855b5a0192eb',
  'cfa4e80e-d919-49b1-bf05-4229d201abbc',
  '80132498-d756-4d3a-b403-1424a88f221f',
  '022436f6-0804-448e-9fcd-e50c3e521789',
  'ca14dfaf-2816-47fc-8070-28d874e70579',
  '42943b4b-1971-42ea-96f7-06c2a36dbc34',
  '5177a50b-3fc4-4074-a47a-f2b4efd46ed2',
];

const URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) { console.error('Missing env'); process.exit(1); }

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

(async () => {
  const results: Array<{ id: string; ok: boolean; status: number; detail?: string }> = [];
  for (const id of IDS) {
    try {
      const r = await fetch(`${URL}/functions/v1/generate-translations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${KEY}`,
          'apikey': KEY,
        },
        body: JSON.stringify({ listing_id: id }),
      });
      const text = await r.text();
      const ok = r.ok;
      results.push({ id, ok, status: r.status, detail: ok ? text.slice(0, 120) : text.slice(0, 400) });
      console.log(`${ok ? '✓' : '✗'} ${id} [${r.status}] ${ok ? 'ok' : text.slice(0, 200)}`);
    } catch (e) {
      results.push({ id, ok: false, status: 0, detail: String(e) });
      console.log(`✗ ${id} threw: ${e}`);
    }
    await sleep(1000);
  }
  const okCount = results.filter(r => r.ok).length;
  console.log(`\nDone: ${okCount}/${IDS.length} succeeded`);
})();
