
import { createClient } from './server'
import { createServiceClient } from './service'
import type { Project } from '@/lib/project-store'

export async function getProjects() {
    const supabase = await createClient()

    // RLS ensures users only see their own projects
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching projects:', error)
        return []
    }

    // Convert DB snake_case to app camelCase
    return data.map(transformProjectFromDB)
}

// Public access function - uses service role to bypass RLS for client view
export async function getProjectById(id: string) {
    const supabase = createServiceClient()

    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single()

    if (error || !data) {
        console.error('[getProjectById] Failed to fetch project:', { id, error, data })
        return null
    }
    return transformProjectFromDB(data)
}

export async function createProject(project: Project) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    const dbProject = transformProjectToDB(project, user.id)

    const { error } = await supabase
        .from('projects')
        .insert(dbProject)

    if (error) throw error
    return project
}

export async function updateProject(id: string, updates: Partial<Project>) {
    const supabase = await createClient()

    const dbUpdates: any = {}

    // Manual mapping for updates
    if (updates.clientName) dbUpdates.client_name = updates.clientName
    if (updates.gdriveLink) dbUpdates.gdrive_link = updates.gdriveLink
    if (updates.clientWhatsapp) dbUpdates.client_whatsapp = updates.clientWhatsapp
    if (updates.adminWhatsapp) dbUpdates.admin_whatsapp = updates.adminWhatsapp
    if (updates.countryCode) dbUpdates.country_code = updates.countryCode
    if (updates.maxPhotos !== undefined) dbUpdates.max_photos = updates.maxPhotos
    if (updates.password !== undefined) dbUpdates.password = updates.password
    if (updates.detectSubfolders !== undefined) dbUpdates.detect_subfolders = updates.detectSubfolders
    if (updates.expiresAt !== undefined) dbUpdates.expires_at = updates.expiresAt ? new Date(updates.expiresAt).toISOString() : null
    if (updates.link) dbUpdates.link = updates.link
    if (updates.lockedPhotos) dbUpdates.locked_photos = updates.lockedPhotos

    const { error } = await supabase
        .from('projects')
        .update(dbUpdates)
        .eq('id', id)

    if (error) throw error
    return true
}

export async function deleteProject(id: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)

    if (error) throw error
    return true
}

// --- Helpers ---

function transformProjectFromDB(db: any): Project {
    return {
        id: db.id,
        clientName: db.client_name,
        gdriveLink: db.gdrive_link,
        clientWhatsapp: db.client_whatsapp || '',
        adminWhatsapp: db.admin_whatsapp || '',
        countryCode: db.country_code,
        maxPhotos: db.max_photos,
        password: db.password,
        detectSubfolders: db.detect_subfolders,
        expiresAt: db.expires_at ? new Date(db.expires_at).getTime() : undefined,
        createdAt: new Date(db.created_at).getTime(),
        link: db.link,
        lockedPhotos: db.locked_photos || [],
    }
}

function transformProjectToDB(project: Project, userId: string) {
    return {
        id: project.id,
        user_id: userId,
        client_name: project.clientName,
        gdrive_link: project.gdriveLink,
        client_whatsapp: project.clientWhatsapp,
        admin_whatsapp: project.adminWhatsapp,
        country_code: project.countryCode,
        max_photos: project.maxPhotos,
        password: project.password,
        detect_subfolders: project.detectSubfolders,
        expires_at: project.expiresAt ? new Date(project.expiresAt).toISOString() : null,
        created_at: new Date(project.createdAt).toISOString(),
        link: project.link,
        locked_photos: project.lockedPhotos || [],
    }
}
