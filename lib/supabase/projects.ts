
import { createClient } from './server'
import { createServiceClient } from './service'
import type { Project, ProjectFreelancerSnapshot } from '@/lib/project-store'

export async function getUserId(): Promise<string | null> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id || null
}


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

export async function createBatchProjects(projects: Project[]) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    // Stagger created_at by 1ms per project so spreadsheet order is preserved
    // when sorted by created_at DESC (first row = latest timestamp = appears first)
    const now = Date.now()
    const dbProjects = projects.map((p, index) => {
        const staggered = { ...p, createdAt: now - index }
        return transformProjectToDB(staggered, user.id)
    })

    const { error } = await supabase
        .from('projects')
        .insert(dbProjects)

    if (error) throw error
    return projects
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
    if (updates.downloadExpiresAt !== undefined) dbUpdates.download_expires_at = updates.downloadExpiresAt ? new Date(updates.downloadExpiresAt).toISOString() : null
    if (updates.selectionEnabled !== undefined) dbUpdates.selection_enabled = updates.selectionEnabled
    if (updates.downloadEnabled !== undefined) dbUpdates.download_enabled = updates.downloadEnabled
    if (updates.link) dbUpdates.link = updates.link
    if (updates.lockedPhotos) dbUpdates.locked_photos = updates.lockedPhotos
    if (updates.extraEnabled !== undefined) dbUpdates.extra_enabled = updates.extraEnabled
    if (updates.extraMaxPhotos !== undefined) dbUpdates.extra_max_photos = updates.extraMaxPhotos
    if (updates.extraExpiresAt !== undefined) dbUpdates.extra_expires_at = updates.extraExpiresAt ? new Date(updates.extraExpiresAt).toISOString() : null
    if (updates.extraSelectedPhotos !== undefined) dbUpdates.extra_selected_photos = updates.extraSelectedPhotos || []
    if (updates.extraStatus !== undefined) dbUpdates.extra_status = updates.extraStatus
    if (updates.extraSubmittedAt !== undefined) dbUpdates.extra_submitted_at = updates.extraSubmittedAt ? new Date(updates.extraSubmittedAt).toISOString() : null
    if (updates.extraLastSyncedAt !== undefined) dbUpdates.extra_last_synced_at = updates.extraLastSyncedAt ? new Date(updates.extraLastSyncedAt).toISOString() : null
    if (updates.printEnabled !== undefined) dbUpdates.print_enabled = updates.printEnabled
    if (updates.printExpiresAt !== undefined) dbUpdates.print_expires_at = updates.printExpiresAt ? new Date(updates.printExpiresAt).toISOString() : null
    if (updates.projectType !== undefined) dbUpdates.project_type = updates.projectType
    if (updates.printSizes !== undefined) dbUpdates.print_sizes = updates.printSizes
    if (updates.folderId !== undefined) dbUpdates.folder_id = updates.folderId || null
    if (updates.freelancersSnapshot !== undefined) dbUpdates.freelancers_snapshot = updates.freelancersSnapshot || []

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

function sanitizeFreelancersSnapshot(value: unknown): ProjectFreelancerSnapshot[] {
    if (!Array.isArray(value)) return []
    return value
        .map((entry) => {
            if (!entry || typeof entry !== 'object') return null
            const typed = entry as { id?: unknown; name?: unknown; whatsapp?: unknown }
            const name = typeof typed.name === 'string' ? typed.name.trim() : ''
            const whatsapp = typeof typed.whatsapp === 'string' ? typed.whatsapp.trim() : ''
            const id = typeof typed.id === 'string' ? typed.id.trim() : ''
            if (!name || !whatsapp) return null
            return id
                ? { id, name, whatsapp }
                : { name, whatsapp }
        })
        .filter((entry): entry is ProjectFreelancerSnapshot => Boolean(entry))
}

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
        downloadExpiresAt: db.download_expires_at ? new Date(db.download_expires_at).getTime() : undefined,
        selectionEnabled: db.selection_enabled !== false,
        downloadEnabled: db.download_enabled !== false,
        createdAt: new Date(db.created_at).getTime(),
        link: db.link,
        lockedPhotos: db.locked_photos || [],
        folderId: db.folder_id || null,
        selectedPhotos: db.selected_photos || [],
        selectionStatus: db.selection_status || 'pending',
        selectionSubmittedAt: db.selection_submitted_at ? new Date(db.selection_submitted_at).getTime() : null,
        selectionLastSyncedAt: db.selection_last_synced_at ? new Date(db.selection_last_synced_at).getTime() : null,
        extraEnabled: Boolean(db.extra_enabled),
        extraMaxPhotos: typeof db.extra_max_photos === 'number' ? db.extra_max_photos : null,
        extraExpiresAt: db.extra_expires_at ? new Date(db.extra_expires_at).getTime() : undefined,
        extraSelectedPhotos: db.extra_selected_photos || [],
        extraStatus: db.extra_status || 'pending',
        extraSubmittedAt: db.extra_submitted_at ? new Date(db.extra_submitted_at).getTime() : null,
        extraLastSyncedAt: db.extra_last_synced_at ? new Date(db.extra_last_synced_at).getTime() : null,
        // Print selection
        projectType: db.project_type || 'edit',
        printEnabled: db.print_enabled || false,
        printExpiresAt: db.print_expires_at ? new Date(db.print_expires_at).getTime() : undefined,
        printSizes: db.print_sizes || [],
        printSelections: db.print_selections || [],
        printStatus: db.print_status || 'pending',
        printSubmittedAt: db.print_submitted_at ? new Date(db.print_submitted_at).getTime() : null,
        printLastSyncedAt: db.print_last_synced_at ? new Date(db.print_last_synced_at).getTime() : null,
        freelancersSnapshot: sanitizeFreelancersSnapshot(db.freelancers_snapshot),
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
        download_expires_at: project.downloadExpiresAt ? new Date(project.downloadExpiresAt).toISOString() : null,
        selection_enabled: project.selectionEnabled !== false,
        download_enabled: project.downloadEnabled !== false,
        created_at: new Date(project.createdAt).toISOString(),
        link: project.link,
        locked_photos: project.lockedPhotos || [],
        folder_id: project.folderId || null,
        extra_enabled: project.extraEnabled || false,
        extra_max_photos: project.extraMaxPhotos ?? null,
        extra_expires_at: project.extraExpiresAt ? new Date(project.extraExpiresAt).toISOString() : null,
        extra_selected_photos: project.extraSelectedPhotos || [],
        extra_status: project.extraStatus || 'pending',
        extra_submitted_at: project.extraSubmittedAt ? new Date(project.extraSubmittedAt).toISOString() : null,
        extra_last_synced_at: project.extraLastSyncedAt ? new Date(project.extraLastSyncedAt).toISOString() : null,
        // Print selection
        project_type: project.projectType || 'edit',
        print_enabled: project.printEnabled || false,
        print_expires_at: project.printExpiresAt ? new Date(project.printExpiresAt).toISOString() : null,
        print_sizes: project.printSizes || [],
        freelancers_snapshot: project.freelancersSnapshot || [],
    }
}
