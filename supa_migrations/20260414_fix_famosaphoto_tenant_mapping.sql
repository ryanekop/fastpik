-- Fix FAMOSAPHOTO tenant mapping so ClientDesk sync returns the custom-domain link.
-- After this runs, re-sync affected bookings from Client Desk to refresh stored project_link values.

BEGIN;

DO $$
DECLARE
    v_target_tenant_id uuid;
    v_updated_rows integer;
BEGIN
    SELECT id
    INTO v_target_tenant_id
    FROM tenants
    WHERE domain = 'pilih.famosaphoto.my.id'
    LIMIT 1;

    IF v_target_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Target tenant for domain % was not found.', 'pilih.famosaphoto.my.id';
    END IF;

    UPDATE settings
    SET tenant_id = v_target_tenant_id,
        updated_at = NOW()
    WHERE user_id = '2c3fd931-1ed6-4301-8771-27c913dc5f42';

    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;

    IF v_updated_rows <> 1 THEN
        RAISE EXCEPTION
            'Expected to update exactly 1 settings row for user %, updated % row(s).',
            '2c3fd931-1ed6-4301-8771-27c913dc5f42',
            v_updated_rows;
    END IF;
END
$$;

COMMIT;

-- Verification query
SELECT
    s.user_id,
    s.vendor_name,
    s.clientdesk_integration_enabled,
    s.clientdesk_api_key_id,
    s.tenant_id,
    t.slug AS tenant_slug,
    t.name AS tenant_name,
    t.domain AS tenant_domain,
    t.is_active AS tenant_is_active
FROM settings s
LEFT JOIN tenants t
    ON t.id = s.tenant_id
WHERE s.user_id = '2c3fd931-1ed6-4301-8771-27c913dc5f42';
