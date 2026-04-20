CREATE OR REPLACE FUNCTION public.delete_user_cascade(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_agent_ids uuid[]; v_agency_ids uuid[]; v_prop_ids uuid[];
  v_trust_ids uuid[]; v_conv_ids uuid[];
BEGIN
  SELECT COALESCE(array_agg(id),'{}') INTO v_agent_ids FROM agents WHERE user_id=p_user_id;
  SELECT COALESCE(array_agg(id),'{}') INTO v_agency_ids FROM agencies WHERE owner_user_id=p_user_id;
  IF array_length(v_agent_ids,1)>0 THEN SELECT COALESCE(array_agg(id),'{}') INTO v_prop_ids FROM properties WHERE agent_id=ANY(v_agent_ids); END IF;
  v_prop_ids := COALESCE(v_prop_ids,'{}');
  IF array_length(v_agent_ids,1)>0 THEN SELECT COALESCE(array_agg(id),'{}') INTO v_trust_ids FROM trust_accounts WHERE agent_id=ANY(v_agent_ids); END IF;
  v_trust_ids := COALESCE(v_trust_ids,'{}');
  SELECT COALESCE(array_agg(id),'{}') INTO v_conv_ids FROM conversations WHERE participant_1=p_user_id OR participant_2=p_user_id;

  -- Properties
  BEGIN IF array_length(v_prop_ids,1)>0 THEN
    DELETE FROM listing_documents WHERE property_id=ANY(v_prop_ids);
    DELETE FROM saved_properties WHERE property_id=ANY(v_prop_ids);
    DELETE FROM lead_events WHERE property_id=ANY(v_prop_ids);
    DELETE FROM leads WHERE property_id=ANY(v_prop_ids);
    DELETE FROM collab_reactions WHERE property_id=ANY(v_prop_ids);
    DELETE FROM collab_views WHERE property_id=ANY(v_prop_ids);
    DELETE FROM off_market_shares WHERE property_id=ANY(v_prop_ids);
    DELETE FROM rental_applications WHERE property_id=ANY(v_prop_ids);
    DELETE FROM transactions WHERE property_id=ANY(v_prop_ids);
    BEGIN DELETE FROM listing_buyer_matches WHERE listing_id=ANY(v_prop_ids); EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM notifications WHERE property_id=ANY(v_prop_ids); EXCEPTION WHEN OTHERS THEN NULL; END;
    DELETE FROM properties WHERE id=ANY(v_prop_ids);
  END IF; EXCEPTION WHEN OTHERS THEN NULL; END;

  -- Trust
  BEGIN IF array_length(v_trust_ids,1)>0 THEN
    DELETE FROM trust_transactions WHERE trust_account_id=ANY(v_trust_ids);
    DELETE FROM trust_account_balances WHERE agent_id=ANY(v_agent_ids);
    DELETE FROM trust_receipts WHERE agent_id=ANY(v_agent_ids);
    DELETE FROM trust_payments WHERE agent_id=ANY(v_agent_ids);
    DELETE FROM trust_reconciliations WHERE agent_id=ANY(v_agent_ids);
    DELETE FROM trust_accounts WHERE id=ANY(v_trust_ids);
  END IF; EXCEPTION WHEN OTHERS THEN NULL; END;

  -- Agents
  BEGIN IF array_length(v_agent_ids,1)>0 THEN
    DELETE FROM notifications WHERE agent_id=ANY(v_agent_ids);
    DELETE FROM lead_events WHERE agent_id=ANY(v_agent_ids);
    DELETE FROM leads WHERE agent_id=ANY(v_agent_ids);
    DELETE FROM agent_subscriptions WHERE agent_id=ANY(v_agent_ids);
    DELETE FROM agent_credentials WHERE agent_id=ANY(v_agent_ids);
    DELETE FROM agent_locations WHERE agent_id=ANY(v_agent_ids);
    DELETE FROM off_market_shares WHERE sharing_agent_id=ANY(v_agent_ids) OR shared_with_agent_id=ANY(v_agent_ids);
    DELETE FROM contacts WHERE assigned_agent_id=ANY(v_agent_ids);
    DELETE FROM rental_applications WHERE agent_id=ANY(v_agent_ids);
    DELETE FROM transactions WHERE agent_id=ANY(v_agent_ids);
    DELETE FROM agents WHERE id=ANY(v_agent_ids);
  END IF; EXCEPTION WHEN OTHERS THEN NULL; END;

  -- Agencies
  BEGIN IF array_length(v_agency_ids,1)>0 THEN
    DELETE FROM agency_invite_codes WHERE agency_id=ANY(v_agency_ids);
    DELETE FROM agency_members WHERE agency_id=ANY(v_agency_ids);
    BEGIN DELETE FROM activities WHERE office_id=ANY(v_agency_ids); EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM tasks WHERE office_id=ANY(v_agency_ids); EXCEPTION WHEN OTHERS THEN NULL; END;
    DELETE FROM transactions WHERE office_id=ANY(v_agency_ids);
    DELETE FROM contacts WHERE agency_id=ANY(v_agency_ids);
    UPDATE agents SET agency_id=NULL WHERE agency_id=ANY(v_agency_ids);
    DELETE FROM agencies WHERE id=ANY(v_agency_ids);
  END IF; EXCEPTION WHEN OTHERS THEN NULL; END;

  -- Conversations
  BEGIN IF array_length(v_conv_ids,1)>0 THEN DELETE FROM messages WHERE conversation_id=ANY(v_conv_ids); END IF; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM messages WHERE sender_id=p_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM conversations WHERE participant_1=p_user_id OR participant_2=p_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;

  -- AI tables
  BEGIN DELETE FROM buyer_activity_events WHERE user_id=p_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM buyer_intent WHERE user_id=p_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;

  -- User-level
  BEGIN DELETE FROM agency_members WHERE user_id=p_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM agency_invite_codes WHERE created_by=p_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM saved_properties WHERE user_id=p_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM saved_search_alerts WHERE user_id=p_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM buyer_profiles WHERE user_id=p_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM collab_reactions WHERE user_id=p_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM collab_views WHERE user_id=p_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM contact_activities WHERE user_id=p_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM contacts WHERE created_by=p_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM activities WHERE user_id=p_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM tasks WHERE user_id=p_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM leads WHERE user_id=p_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM lead_events WHERE user_id=p_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM user_preferences WHERE user_id=p_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  DELETE FROM user_roles WHERE user_id=p_user_id;
  DELETE FROM profiles WHERE user_id=p_user_id;
END; $$;