
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { sendTelegramMessage } from '@/lib/telegram'

export async function POST(request: NextRequest) {
    try {
        const { chat_id } = await request.json()

        if (!chat_id) {
            return NextResponse.json({ error: 'chat_id is required' }, { status: 400 })
        }

        if (!process.env.TELEGRAM_BOT_TOKEN) {
            return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN not configured on server' }, { status: 500 })
        }

        const testMessage = [
            '✅ <b>Fastpik Telegram Bot Connected!</b>',
            '',
            'Bot berhasil terhubung dengan akun Anda.',
            'Anda akan menerima notifikasi reminder otomatis ketika project mendekati tanggal expired.',
            '',
            `📅 Waktu test: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`,
        ].join('\n')

        const result = await sendTelegramMessage(chat_id, testMessage)

        if (result.ok) {
            return NextResponse.json({ success: true, message: 'Test message sent successfully' })
        } else {
            return NextResponse.json(
                { success: false, error: result.description || 'Failed to send message' },
                { status: 400 }
            )
        }
    } catch (err: any) {
        console.error('[Telegram Test] Error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
