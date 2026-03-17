export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { resolveClientDeskIntegrationContext } from '../_lib'

export async function POST(request: NextRequest) {
    const resolved = await resolveClientDeskIntegrationContext(request)
    if (resolved.error || !resolved.context) {
        return NextResponse.json(
            { success: false, error: resolved.error || 'Unauthorized' },
            { status: resolved.status },
        )
    }

    const { settings } = resolved.context
    return NextResponse.json({
        success: true,
        status: 'connected',
        userId: settings.user_id,
        vendorName: settings.vendor_name || null,
        integrationEnabled: Boolean(settings.clientdesk_integration_enabled),
    })
}
