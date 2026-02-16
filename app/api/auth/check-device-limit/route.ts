
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'
import { checkDeviceLimit } from '@/lib/supabase/sessions'

export async function POST(request: Request) {
    try {
        // We expect the user to have a session cookie already from Supabase client login
        const userAgent = request.headers.get('user-agent') || 'Unknown Device'
        await checkDeviceLimit(userAgent)
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Device limit check failed:", error)
        return NextResponse.json({ success: false }, { status: 500 })
    }
}
