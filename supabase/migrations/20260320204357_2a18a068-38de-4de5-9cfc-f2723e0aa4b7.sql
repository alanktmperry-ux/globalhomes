-- Create a trigger function that fires on new messages
-- and creates a notification for the recipient (if they are an agent)
CREATE OR REPLACE FUNCTION public.notify_on_new_message()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _convo RECORD;
  _recipient_id uuid;
  _sender_name text;
  _agent RECORD;
BEGIN
  -- Get conversation details
  SELECT * INTO _convo FROM conversations WHERE id = NEW.conversation_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  -- Determine recipient
  IF _convo.participant_1 = NEW.sender_id THEN
    _recipient_id := _convo.participant_2;
  ELSE
    _recipient_id := _convo.participant_1;
  END IF;

  -- Get sender display name (check agents first, then profiles)
  SELECT name INTO _sender_name FROM agents WHERE user_id = NEW.sender_id LIMIT 1;
  IF _sender_name IS NULL THEN
    SELECT display_name INTO _sender_name FROM profiles WHERE user_id = NEW.sender_id LIMIT 1;
  END IF;
  IF _sender_name IS NULL THEN
    _sender_name := 'Someone';
  END IF;

  -- Check if recipient is an agent (notifications table requires agent_id)
  SELECT id INTO _agent FROM agents WHERE user_id = _recipient_id LIMIT 1;
  IF _agent.id IS NOT NULL THEN
    INSERT INTO notifications (agent_id, type, title, message, property_id)
    VALUES (
      _agent.id,
      'message',
      'New message from ' || _sender_name,
      LEFT(NEW.content, 100),
      _convo.property_id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Attach the trigger
DROP TRIGGER IF EXISTS on_new_message_notify ON public.messages;
CREATE TRIGGER on_new_message_notify
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_new_message();
