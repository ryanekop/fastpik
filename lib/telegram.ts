
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
    clientWhatsapp?: string
    link: string
    maxPhotos: number
    password?: string
    selectionStatus: string
    daysLeftSelection?: number
    daysLeftDownload?: number
}

function compileTemplate(template: string, variables: Record<string, string>): string {
    let msg = template
    Object.entries(variables).forEach(([key, val]) => {
        msg = msg.replace(new RegExp(`{{${key}}}`, 'g'), val)
    })
    // Remove any unreplaced variables
    msg = msg.replace(/{{(\w+)}}/g, '').replace(/\n{3,}/g, '\n\n').trim()
    return msg
}

export function formatReminderMessage(
    projects: ReminderProject[],
    vendorName?: string,
    reminderTemplate?: { id: string; en: string } | null
): string {
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

        // WhatsApp reminder link
        if (p.clientWhatsapp) {
            const daysLeft = p.daysLeftSelection ?? p.daysLeftDownload
            const durationText = daysLeft === 1 ? 'besok' : `${daysLeft} hari`

            // Build template variables
            const variables: Record<string, string> = {
                client_name: p.clientName,
                link: p.link,
                count: p.maxPhotos.toString(),
                max_photos: p.maxPhotos.toString(),
                duration: durationText,
                download_duration: durationText
            }
            if (p.password) {
                variables.password = p.password
            }

            let reminderText: string

            // Use custom template if available (use Indonesian version)
            const tmplText = reminderTemplate?.id || ''
            if (tmplText.trim()) {
                reminderText = compileTemplate(tmplText, variables)
            } else {
                // Default fallback message
                reminderText = daysLeft === 1
                    ? `Halo ${p.clientName}, ini reminder bahwa link foto kamu akan expired besok. Silakan segera pilih/download foto ya 😊`
                    : `Halo ${p.clientName}, ini reminder bahwa link foto kamu akan expired dalam ${daysLeft} hari lagi. Silakan segera pilih/download foto ya 😊`
            }

            const waNumber = p.clientWhatsapp.replace(/[^0-9]/g, '')
            const waLink = `https://api.whatsapp.com/send/?phone=${waNumber}&text=${encodeURIComponent(reminderText)}`
            lines.push(`💬 <a href="${waLink}">Kirim reminder via WhatsApp</a>`)
            lines.push('')
        }
    }

    lines.push(`💡 Segera ingatkan klien untuk memilih/download foto sebelum linknya berakhir.`)

    return lines.join('\n')
}
