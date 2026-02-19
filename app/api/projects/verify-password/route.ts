export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(request: Request) {
    try {
        const { projectId, password } = await request.json()

        if (!projectId || typeof password !== 'string') {
            return NextResponse.json({ error: 'Missing projectId or password' }, { status: 400 })
        }

        const supabase = createServiceClient()
        const { data, error } = await supabase
            .from('projects')
            .select('password')
            .eq('id', projectId)
            .single()

        if (error || !data) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 })
        }

        const isCorrect = data.password === password
        return NextResponse.json({ success: isCorrect })
    } catch (error) {
        console.error('Password verification failed:', error)
        return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
    }
}
