-- Create RPC functions for testing audit logs
-- These functions allow the test client to query audit schema tables

-- Function to query access logs by request_id
CREATE OR REPLACE FUNCTION query_access_logs_by_request_id(
  request_id_param TEXT,
  cutoff_time_param TIMESTAMPTZ
)
RETURNS TABLE (
  id BIGINT,
  occurred_at_utc TIMESTAMPTZ,
  action TEXT,
  resource TEXT,
  result TEXT,
  request_id TEXT,
  meta JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.id,
    al.occurred_at_utc,
    al.action,
    al.resource,
    al.result,
    al.request_id,
    al.meta
  FROM audit.access_log al
  WHERE al.request_id = request_id_param
    AND al.occurred_at_utc >= cutoff_time_param
  ORDER BY al.occurred_at_utc ASC;
END;
$$;

-- Function to query event logs by correlation_id
CREATE OR REPLACE FUNCTION query_event_logs_by_correlation_id(
  correlation_id_param TEXT,
  cutoff_time_param TIMESTAMPTZ
)
RETURNS TABLE (
  id BIGINT,
  occurred_at_utc TIMESTAMPTZ,
  action TEXT,
  resource TEXT,
  resource_id TEXT,
  actor_role TEXT,
  result TEXT,
  reason TEXT,
  correlation_id TEXT,
  meta JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    el.id,
    el.occurred_at_utc,
    el.action,
    el.resource,
    el.resource_id,
    el.actor_role,
    el.result,
    el.reason,
    el.correlation_id,
    el.meta
  FROM audit.event_log el
  WHERE el.correlation_id = correlation_id_param
    AND el.occurred_at_utc >= cutoff_time_param
  ORDER BY el.occurred_at_utc ASC;
END;
$$;

-- Function to query recent access logs
CREATE OR REPLACE FUNCTION query_recent_access_logs(
  cutoff_time_param TIMESTAMPTZ
)
RETURNS TABLE (
  id BIGINT,
  occurred_at_utc TIMESTAMPTZ,
  action TEXT,
  resource TEXT,
  result TEXT,
  request_id TEXT,
  meta JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.id,
    al.occurred_at_utc,
    al.action,
    al.resource,
    al.result,
    al.request_id,
    al.meta
  FROM audit.access_log al
  WHERE al.occurred_at_utc >= cutoff_time_param
  ORDER BY al.occurred_at_utc DESC
  LIMIT 20;
END;
$$;

-- Function to query recent event logs
CREATE OR REPLACE FUNCTION query_recent_event_logs(
  cutoff_time_param TIMESTAMPTZ
)
RETURNS TABLE (
  id BIGINT,
  occurred_at_utc TIMESTAMPTZ,
  action TEXT,
  resource TEXT,
  resource_id TEXT,
  actor_role TEXT,
  result TEXT,
  reason TEXT,
  correlation_id TEXT,
  meta JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    el.id,
    el.occurred_at_utc,
    el.action,
    el.resource,
    el.resource_id,
    el.actor_role,
    el.result,
    el.reason,
    el.correlation_id,
    el.meta
  FROM audit.event_log el
  WHERE el.occurred_at_utc >= cutoff_time_param
  ORDER BY el.occurred_at_utc DESC
  LIMIT 20;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION query_access_logs_by_request_id(TEXT, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION query_event_logs_by_correlation_id(TEXT, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION query_recent_access_logs(TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION query_recent_event_logs(TIMESTAMPTZ) TO authenticated;
