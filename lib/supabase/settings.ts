
import { createClient } from './server'

export interface Settings {
    defaultMaxPhotos: number
    defaultCountryCode: string
    defaultExpiryDays: number
}

export async function getSettings(): Promise<Settings> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('settings')
        .select('*')
        .single()

    if (error || !data) {
        // Return defaults if no settings found (or error)
        return {
            defaultMaxPhotos: 10,
            defaultCountryCode: '+62',
            defaultExpiryDays: 7
        }
    }

    return {
        defaultMaxPhotos: data.default_max_photos,
        defaultCountryCode: data.default_country_code,
        defaultExpiryDays: data.default_expiry_days
    }
}

export async function updateSettings(settings: Partial<Settings>) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    // Check if settings exist, if not create
    const { count } = await supabase
        .from('settings')
        .select('*', { count: 'exact', head: true })

    const dbData: any = {
        user_id: user.id
    }

    if (settings.defaultMaxPhotos !== undefined) dbData.default_max_photos = settings.defaultMaxPhotos
    if (settings.defaultCountryCode !== undefined) dbData.default_country_code = settings.defaultCountryCode
    if (settings.defaultExpiryDays !== undefined) dbData.default_expiry_days = settings.defaultExpiryDays

    let error;
    if (count === 0) {
        // Insert
        const { error: insertError } = await supabase
            .from('settings')
            .insert(dbData)
        error = insertError
    } else {
        // Update
        const { error: updateError } = await supabase
            .from('settings')
            .update(dbData)
            .eq('user_id', user.id)
        error = updateError
    }

    if (error) throw error
    return true
}
