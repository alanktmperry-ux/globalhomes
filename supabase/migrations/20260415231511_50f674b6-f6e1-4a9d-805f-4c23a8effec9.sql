
-- Table 1: property_inspections
CREATE TABLE public.property_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id uuid REFERENCES public.tenancies(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES public.agents(id) ON DELETE CASCADE,
  inspection_type text NOT NULL,
  scheduled_date date NOT NULL,
  conducted_date date,
  status text NOT NULL DEFAULT 'scheduled',
  notice_sent_at timestamptz,
  water_meter_reading text,
  keys_count integer,
  remotes_count integer,
  bond_lodgment_number text,
  owner_name text,
  owner_email text,
  tenant_dispute_deadline date,
  tenant_accepted_at timestamptz,
  tenant_disputed_at timestamptz,
  tenant_dispute_notes text,
  overall_notes text,
  report_token text UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  finalised_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Validation trigger for inspection_type
CREATE OR REPLACE FUNCTION public.validate_inspection_type()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.inspection_type NOT IN ('entry', 'routine', 'exit') THEN
    RAISE EXCEPTION 'Invalid inspection_type: %', NEW.inspection_type;
  END IF;
  IF NEW.status NOT IN ('scheduled', 'in_progress', 'completed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid inspection status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_inspection
  BEFORE INSERT OR UPDATE ON public.property_inspections
  FOR EACH ROW EXECUTE FUNCTION public.validate_inspection_type();

-- updated_at trigger
CREATE TRIGGER update_property_inspections_updated_at
  BEFORE UPDATE ON public.property_inspections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table 2: inspection_rooms
CREATE TABLE public.inspection_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid REFERENCES public.property_inspections(id) ON DELETE CASCADE,
  room_name text NOT NULL,
  condition text,
  notes text,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.validate_room_condition()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.condition IS NOT NULL AND NEW.condition NOT IN ('excellent', 'good', 'fair', 'poor', 'damaged', 'na') THEN
    RAISE EXCEPTION 'Invalid room condition: %', NEW.condition;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_room_condition
  BEFORE INSERT OR UPDATE ON public.inspection_rooms
  FOR EACH ROW EXECUTE FUNCTION public.validate_room_condition();

-- Table 3: inspection_room_photos
CREATE TABLE public.inspection_room_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES public.inspection_rooms(id) ON DELETE CASCADE,
  inspection_id uuid REFERENCES public.property_inspections(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  caption text,
  created_at timestamptz DEFAULT now()
);

-- Table 4: inspection_maintenance_items
CREATE TABLE public.inspection_maintenance_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid REFERENCES public.property_inspections(id) ON DELETE CASCADE,
  room_id uuid REFERENCES public.inspection_rooms(id) ON DELETE SET NULL,
  description text NOT NULL,
  priority text DEFAULT 'normal',
  status text DEFAULT 'open',
  created_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.validate_inspection_maintenance()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.priority NOT IN ('urgent', 'normal', 'low') THEN
    RAISE EXCEPTION 'Invalid maintenance priority: %', NEW.priority;
  END IF;
  IF NEW.status NOT IN ('open', 'in_progress', 'resolved') THEN
    RAISE EXCEPTION 'Invalid maintenance status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_inspection_maintenance
  BEFORE INSERT OR UPDATE ON public.inspection_maintenance_items
  FOR EACH ROW EXECUTE FUNCTION public.validate_inspection_maintenance();

-- Indexes
CREATE INDEX idx_property_inspections_tenancy ON public.property_inspections(tenancy_id);
CREATE INDEX idx_property_inspections_agent ON public.property_inspections(agent_id);
CREATE INDEX idx_property_inspections_token ON public.property_inspections(report_token);
CREATE INDEX idx_inspection_rooms_inspection ON public.inspection_rooms(inspection_id);
CREATE INDEX idx_inspection_room_photos_inspection ON public.inspection_room_photos(inspection_id);
CREATE INDEX idx_inspection_maintenance_inspection ON public.inspection_maintenance_items(inspection_id);

-- RLS
ALTER TABLE public.property_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_room_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_maintenance_items ENABLE ROW LEVEL SECURITY;

-- property_inspections policies
CREATE POLICY "Agents manage own inspections"
  ON public.property_inspections FOR ALL
  TO authenticated
  USING (agent_id = public.get_my_agent_id())
  WITH CHECK (agent_id = public.get_my_agent_id());

-- inspection_rooms policies
CREATE POLICY "Agents manage own inspection rooms"
  ON public.inspection_rooms FOR ALL
  TO authenticated
  USING (inspection_id IN (SELECT id FROM public.property_inspections WHERE agent_id = public.get_my_agent_id()))
  WITH CHECK (inspection_id IN (SELECT id FROM public.property_inspections WHERE agent_id = public.get_my_agent_id()));

-- inspection_room_photos policies
CREATE POLICY "Agents manage own inspection photos"
  ON public.inspection_room_photos FOR ALL
  TO authenticated
  USING (inspection_id IN (SELECT id FROM public.property_inspections WHERE agent_id = public.get_my_agent_id()))
  WITH CHECK (inspection_id IN (SELECT id FROM public.property_inspections WHERE agent_id = public.get_my_agent_id()));

-- inspection_maintenance_items policies
CREATE POLICY "Agents manage own inspection maintenance"
  ON public.inspection_maintenance_items FOR ALL
  TO authenticated
  USING (inspection_id IN (SELECT id FROM public.property_inspections WHERE agent_id = public.get_my_agent_id()))
  WITH CHECK (inspection_id IN (SELECT id FROM public.property_inspections WHERE agent_id = public.get_my_agent_id()));

-- Public token-based access RPC
CREATE OR REPLACE FUNCTION public.get_inspection_by_token(p_token text)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inspection RECORD;
  v_rooms json;
  v_maintenance json;
BEGIN
  SELECT * INTO v_inspection
  FROM public.property_inspections
  WHERE report_token = p_token AND finalised_at IS NOT NULL;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'not_found');
  END IF;

  SELECT COALESCE(json_agg(json_build_object(
    'id', r.id,
    'room_name', r.room_name,
    'condition', r.condition,
    'notes', r.notes,
    'display_order', r.display_order,
    'photos', COALESCE((
      SELECT json_agg(json_build_object(
        'id', p.id, 'photo_url', p.photo_url, 'caption', p.caption
      ) ORDER BY p.created_at)
      FROM public.inspection_room_photos p WHERE p.room_id = r.id
    ), '[]'::json)
  ) ORDER BY r.display_order, r.room_name), '[]'::json)
  INTO v_rooms
  FROM public.inspection_rooms r WHERE r.inspection_id = v_inspection.id;

  SELECT COALESCE(json_agg(json_build_object(
    'id', m.id, 'description', m.description, 'priority', m.priority,
    'status', m.status, 'room_id', m.room_id
  ) ORDER BY m.created_at), '[]'::json)
  INTO v_maintenance
  FROM public.inspection_maintenance_items m WHERE m.inspection_id = v_inspection.id;

  RETURN json_build_object(
    'id', v_inspection.id,
    'inspection_type', v_inspection.inspection_type,
    'scheduled_date', v_inspection.scheduled_date,
    'conducted_date', v_inspection.conducted_date,
    'status', v_inspection.status,
    'water_meter_reading', v_inspection.water_meter_reading,
    'keys_count', v_inspection.keys_count,
    'remotes_count', v_inspection.remotes_count,
    'bond_lodgment_number', v_inspection.bond_lodgment_number,
    'owner_name', v_inspection.owner_name,
    'overall_notes', v_inspection.overall_notes,
    'finalised_at', v_inspection.finalised_at,
    'tenant_dispute_deadline', v_inspection.tenant_dispute_deadline,
    'rooms', v_rooms,
    'maintenance_items', v_maintenance
  );
END;
$$;

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('inspection-photos', 'inspection-photos', true);

CREATE POLICY "Public read inspection photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'inspection-photos');

CREATE POLICY "Agents upload inspection photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'inspection-photos'
    AND (storage.foldername(name))[1] = public.get_my_agent_id()::text
  );

CREATE POLICY "Agents delete own inspection photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'inspection-photos'
    AND (storage.foldername(name))[1] = public.get_my_agent_id()::text
  );
