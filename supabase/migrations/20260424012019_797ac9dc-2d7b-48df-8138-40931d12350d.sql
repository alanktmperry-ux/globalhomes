-- Backfill latitude/longitude for active listings using a Melbourne suburb centroid lookup.
-- Adds small deterministic jitter (~±150m) so listings within the same suburb don't stack
-- on the exact same point in map views.
DO $$
DECLARE
  centroids jsonb := '{
    "Abbotsford":        {"lat": -37.8027, "lng": 144.9988},
    "Ascot Vale":        {"lat": -37.7755, "lng": 144.9162},
    "Balwyn North":      {"lat": -37.7964, "lng": 145.0822},
    "Brunswick":         {"lat": -37.7670, "lng": 144.9597},
    "Brunswick East":    {"lat": -37.7702, "lng": 144.9783},
    "Camberwell":        {"lat": -37.8270, "lng": 145.0594},
    "Carlton":           {"lat": -37.7984, "lng": 144.9670},
    "Carnegie":          {"lat": -37.8870, "lng": 145.0560},
    "Coburg":            {"lat": -37.7440, "lng": 144.9650},
    "Collingwood":       {"lat": -37.8011, "lng": 144.9881},
    "Cremorne":          {"lat": -37.8290, "lng": 144.9970},
    "Dandenong South":   {"lat": -38.0167, "lng": 145.2167},
    "Docklands":         {"lat": -37.8159, "lng": 144.9460},
    "Doncaster East":    {"lat": -37.7838, "lng": 145.1564},
    "East Melbourne":    {"lat": -37.8156, "lng": 144.9870},
    "Elwood":            {"lat": -37.8829, "lng": 144.9831},
    "Essendon":          {"lat": -37.7510, "lng": 144.9180},
    "Fitzroy":           {"lat": -37.7980, "lng": 144.9780},
    "Hawthorn":          {"lat": -37.8222, "lng": 145.0350},
    "Kensington":        {"lat": -37.7930, "lng": 144.9290},
    "Kew":               {"lat": -37.8060, "lng": 145.0290},
    "Laverton North":    {"lat": -37.8200, "lng": 144.7700},
    "Malvern":           {"lat": -37.8597, "lng": 145.0289},
    "Melbourne":         {"lat": -37.8136, "lng": 144.9631},
    "Moonee Ponds":      {"lat": -37.7660, "lng": 144.9190},
    "Moorabbin":         {"lat": -37.9390, "lng": 145.0420},
    "Northcote":         {"lat": -37.7700, "lng": 144.9990},
    "Oakleigh":          {"lat": -37.9000, "lng": 145.0900},
    "Port Melbourne":    {"lat": -37.8400, "lng": 144.9410},
    "Prahran":           {"lat": -37.8520, "lng": 144.9950},
    "Preston":           {"lat": -37.7400, "lng": 144.9970},
    "Richmond":          {"lat": -37.8190, "lng": 145.0000},
    "South Melbourne":   {"lat": -37.8330, "lng": 144.9590},
    "South Yarra":       {"lat": -37.8390, "lng": 144.9930},
    "Southbank":         {"lat": -37.8240, "lng": 144.9640},
    "St Kilda":          {"lat": -37.8680, "lng": 144.9800},
    "Templestowe Lower": {"lat": -37.7610, "lng": 145.1190},
    "Toorak":            {"lat": -37.8420, "lng": 145.0150},
    "Williamstown":      {"lat": -37.8640, "lng": 144.8990},
    "Yarraville":        {"lat": -37.8160, "lng": 144.8870}
  }'::jsonb;
  rec record;
  c jsonb;
  jitter_lat numeric;
  jitter_lng numeric;
BEGIN
  FOR rec IN
    SELECT id, suburb FROM public.properties
    WHERE is_active = true AND (lat IS NULL OR lng IS NULL) AND suburb IS NOT NULL
  LOOP
    c := centroids -> rec.suburb;
    IF c IS NULL THEN CONTINUE; END IF;
    -- deterministic jitter from id hash, ±0.0015 deg (~150m)
    jitter_lat := ((('x' || substr(md5(rec.id::text), 1, 8))::bit(32)::int % 1000) / 1000.0 - 0.5) * 0.003;
    jitter_lng := ((('x' || substr(md5(rec.id::text), 9, 8))::bit(32)::int % 1000) / 1000.0 - 0.5) * 0.003;
    UPDATE public.properties
    SET lat = (c->>'lat')::double precision + jitter_lat,
        lng = (c->>'lng')::double precision + jitter_lng
    WHERE id = rec.id;
  END LOOP;
END $$;