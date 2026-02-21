
const TELEGRAM_API = 'https://api.telegram.org'

function getBotToken(): string {
    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set')
    return token
}

export async function sendTelegramMessage(chatId: string, message: string): Promise<{ ok: boolean; description?: string }> {
    const token = getBotToken()
    const url = `${TELEGRAM_API}/bot${token}/sendMessage`

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML',
            disable_web_page_preview: true
        })
    })

    const data = await res.json()
    return { ok: data.ok, description: data.description }
}

interface ReminderProject {
    clientName: string
    link: string
    maxPhotos: number
    selectionStatus: string
    daysLeftSelection?: number
    daysLeftDownload?: number
}

export function formatReminderMessage(projects: ReminderProject[], vendorName?: string): string {
    const header = vendorName
        ? `🔔 <b>Reminder dari ${vendorName}</b>`
        : `🔔 <b>Fastpik Reminder</b>`

    const lines: string[] = [header, '']

    for (const p of projects) {
        lines.push(`👤 <b>${p.clientName}</b>`)
        lines.push(`🔗 ${p.link}`)
        lines.push(`📸 Max foto: ${p.maxPhotos}`)
        lines.push(`📋 Status: ${p.selectionStatus === 'submitted' ? '✅ Submitted' : '⏳ Pending'}`)

        if (p.daysLeftSelection !== undefined) {
            if (p.daysLeftSelection <= 0) {
                lines.push(`⚠️ <b>Link pilih foto SUDAH EXPIRED!</b>`)
            } else if (p.daysLeftSelection === 1) {
                lines.push(`⏰ Link pilih foto expired <b>BESOK</b>!`)
            } else {
                lines.push(`⏰ Link pilih foto expired dalam <b>${p.daysLeftSelection} hari</b>`)
            }
        }

        if (p.daysLeftDownload !== undefined) {
            if (p.daysLeftDownload <= 0) {
                lines.push(`⚠️ <b>Link download SUDAH EXPIRED!</b>`)
            } else if (p.daysLeftDownload === 1) {
                lines.push(`📥 Link download expired <b>BESOK</b>!`)
            } else {
                lines.push(`📥 Link download expired dalam <b>${p.daysLeftDownload} hari</b>`)
            }
        }

        lines.push('') // separator between projects
    }

    lines.push(`💡 Segera ingatkan klien untuk memilih/download foto sebelum linknya berakhir.`)

    return lines.join('\n')
}
