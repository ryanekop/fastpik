
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendTelegramMessage, formatReminderMessage } from '@/lib/telegram'

function getSupabaseAdmin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )
}

export async function GET(request: NextRequest) {
    // Verify cron secret
    const cronSecret = request.headers.get('x-cron-secret') || request.nextUrl.searchParams.get('secret')
    if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!process.env.TELEGRAM_BOT_TOKEN) {
        return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN not configured' }, { status: 500 })
    }

    const supabase = getSupabaseAdmin()
    const results: { userId: string; sent: number; errors: string[] }[] = []

    try {
        // Get all users with telegram configured
        const { data: allSettings, error: settingsError } = await supabase
            .from('settings')
            .select('user_id, telegram_chat_id, telegram_reminder_days, telegram_reminder_type, vendor_name')
            .not('telegram_chat_id', 'is', null)
            .neq('telegram_chat_id', '')

        if (settingsError) throw settingsError
        if (!allSettings || allSettings.length === 0) {
            return NextResponse.json({ message: 'No users with Telegram configured', sent: 0 })
        }

        const now = new Date()
        // Reset time to start of day for accurate day calculation
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

        for (const settings of allSettings) {
            const { user_id, telegram_chat_id, telegram_reminder_days, telegram_reminder_type, vendor_name } = settings
            const reminderDays: number[] = telegram_reminder_days || [7, 3]
            const reminderType: string = telegram_reminder_type || 'both'
            const userResult = { userId: user_id, sent: 0, errors: [] as string[] }

            // Fetch all projects for this user that have expiry dates
            const { data: projects, error: projError } = await supabase
                .from('projects')
                .select('id, client_name, link, max_photos, expires_at, download_expires_at, selection_status')
                .eq('user_id', user_id)

            if (projError) {
                userResult.errors.push(`Failed to fetch projects: ${projError.message}`)
                results.push(userResult)
                continue
            }

            if (!projects || projects.length === 0) {
                results.push(userResult)
                continue
            }

            // Find projects that match any reminder day
            const matchingProjects: {
                clientName: string
                link: string
                maxPhotos: number
                selectionStatus: string
                daysLeftSelection?: number
                daysLeftDownload?: number
            }[] = []

            for (const project of projects) {
                let daysLeftSelection: number | undefined
                let daysLeftDownload: number | undefined
                let shouldInclude = false

                // Check selection expiry
                if ((reminderType === 'both' || reminderType === 'selection') && project.expires_at) {
                    const expiryDate = new Date(project.expires_at)
                    const expiryDay = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate())
                    const diffMs = expiryDay.getTime() - today.getTime()
                    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

                    if (diffDays > 0 && reminderDays.includes(diffDays)) {
                        daysLeftSelection = diffDays
                        shouldInclude = true
                    }
                }

                // Check download expiry
                if ((reminderType === 'both' || reminderType === 'download') && project.download_expires_at) {
                    const expiryDate = new Date(project.download_expires_at)
                    const expiryDay = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate())
                    const diffMs = expiryDay.getTime() - today.getTime()
                    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

                    if (diffDays > 0 && reminderDays.includes(diffDays)) {
                        daysLeftDownload = diffDays
                        shouldInclude = true
                    }
                }

                if (shouldInclude) {
                    matchingProjects.push({
                        clientName: project.client_name,
                        link: project.link,
                        maxPhotos: project.max_photos,
                        selectionStatus: project.selection_status || 'pending',
                        daysLeftSelection,
                        daysLeftDownload
                    })
                }
            }

            if (matchingProjects.length === 0) {
                results.push(userResult)
                continue
            }

            // Send Telegram message
            const message = formatReminderMessage(matchingProjects, vendor_name || undefined)

            try {
                const result = await sendTelegramMessage(telegram_chat_id, message)
                if (result.ok) {
                    userResult.sent = matchingProjects.length
                } else {
                    userResult.errors.push(`Telegram API error: ${result.description}`)
                }
            } catch (err: any) {
                userResult.errors.push(`Send failed: ${err.message}`)
            }

            results.push(userResult)
        }

        const totalSent = results.reduce((sum, r) => sum + r.sent, 0)
        const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0)

        return NextResponse.json({
            success: true,
            message: `Processed ${allSettings.length} users, sent ${totalSent} reminders`,
            totalSent,
            totalErrors,
            details: results
        })

    } catch (err: any) {
        console.error('[Telegram Reminder Cron] Error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
