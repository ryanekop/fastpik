
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
    reminderTemplate?: { id: string; en: string } | null,
    lang: 'id' | 'en' = 'id'
): string {
    const isEn = lang === 'en'

    const header = vendorName
        ? `🔔 <b>${isEn ? 'Reminder from' : 'Reminder dari'} ${vendorName}</b>`
        : `🔔 <b>Fastpik Reminder</b>`

    const lines: string[] = [header, '']

    for (const p of projects) {
        lines.push(`👤 <b>${p.clientName}</b>`)
        lines.push(`🔗 ${p.link}`)
        lines.push(`📸 Max ${isEn ? 'photos' : 'foto'}: ${p.maxPhotos}`)
        lines.push(`📋 Status: ${p.selectionStatus === 'submitted' ? '✅ Submitted' : '⏳ Pending'}`)

        if (p.daysLeftSelection !== undefined) {
            if (p.daysLeftSelection <= 0) {
                lines.push(`⚠️ <b>${isEn ? 'Selection link EXPIRED!' : 'Link pilih foto SUDAH EXPIRED!'}</b>`)
            } else if (p.daysLeftSelection === 1) {
                lines.push(`⏰ ${isEn ? 'Selection link expires <b>TOMORROW</b>!' : 'Link pilih foto expired <b>BESOK</b>!'}`)
            } else {
                lines.push(`⏰ ${isEn ? `Selection link expires in <b>${p.daysLeftSelection} days</b>` : `Link pilih foto expired dalam <b>${p.daysLeftSelection} hari</b>`}`)
            }
        }

        if (p.daysLeftDownload !== undefined) {
            if (p.daysLeftDownload <= 0) {
                lines.push(`⚠️ <b>${isEn ? 'Download link EXPIRED!' : 'Link download SUDAH EXPIRED!'}</b>`)
            } else if (p.daysLeftDownload === 1) {
                lines.push(`📥 ${isEn ? 'Download link expires <b>TOMORROW</b>!' : 'Link download expired <b>BESOK</b>!'}`)
            } else {
                lines.push(`📥 ${isEn ? `Download link expires in <b>${p.daysLeftDownload} days</b>` : `Link download expired dalam <b>${p.daysLeftDownload} hari</b>`}`)
            }
        }

        lines.push('') // separator between projects

        // WhatsApp reminder link
        if (p.clientWhatsapp) {
            const daysLeft = p.daysLeftSelection ?? p.daysLeftDownload
            const durationText = isEn
                ? (daysLeft === 1 ? 'tomorrow' : `${daysLeft} days`)
                : (daysLeft === 1 ? 'besok' : `${daysLeft} hari`)

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

            // Use custom template if available (use the selected language)
            const tmplText = (lang === 'id' ? reminderTemplate?.id?.trim() : reminderTemplate?.en?.trim())
                || reminderTemplate?.id?.trim() || reminderTemplate?.en?.trim() || ''
            if (tmplText) {
                reminderText = compileTemplate(tmplText, variables)
            } else {
                // Default fallback message (matches dashboard waReminderMessage format)
                const parts: string[] = []
                if (isEn) {
                    parts.push(`Hi ${p.clientName},`)
                    parts.push('')
                    parts.push('This is a reminder to select your photos.')
                    parts.push('')
                    parts.push(`Please select at the following link:`)
                    parts.push(p.link)
                    parts.push('')
                    parts.push(`Remaining time: ${durationText}`)
                    parts.push('')
                    parts.push('Thank you!')
                } else {
                    parts.push(`Halo ${p.clientName},`)
                    parts.push('')
                    parts.push('Ini adalah pengingat untuk segera memilih foto Anda.')
                    parts.push('')
                    parts.push('Silakan pilih di link berikut:')
                    parts.push(p.link)
                    parts.push('')
                    parts.push(`Sisa waktu: ${durationText}`)
                    parts.push('')
                    parts.push('Terima kasih!')
                }
                if (p.password) {
                    parts.push('')
                    parts.push(`🔐 Password: ${p.password}`)
                }
                reminderText = parts.join('\n')
            }

            const waNumber = p.clientWhatsapp.replace(/[^0-9]/g, '')
            const waLink = `https://api.whatsapp.com/send/?phone=${waNumber}&text=${encodeURIComponent(reminderText)}`
            lines.push(`💬 <a href="${waLink}">${isEn ? 'Send reminder via WhatsApp' : 'Kirim reminder via WhatsApp'}</a>`)
            lines.push('')
        }
    }

    lines.push(`💡 ${isEn ? 'Remind your clients to select/download photos before the link expires.' : 'Segera ingatkan klien untuk memilih/download foto sebelum linknya berakhir.'}`)

    return lines.join('\n')
}
