import { createClient } from './server'

export interface Folder {
    id: string
    name: string
    parentId: string | null
    createdAt: number
}

function transformFolderFromDB(db: any): Folder {
    return {
        id: db.id,
        name: db.name,
        parentId: db.parent_id || null,
        createdAt: new Date(db.created_at).getTime(),
    }
}

export async function getFolders(): Promise<Folder[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('folders')
        .select('*')
        .order('name', { ascending: true })

    if (error) {
        console.error('Error fetching folders:', error)
        return []
    }
    return data.map(transformFolderFromDB)
}

export async function createFolder(name: string, parentId: string | null): Promise<Folder> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    const { data, error } = await supabase
        .from('folders')
        .insert({ name, parent_id: parentId, user_id: user.id })
        .select()
        .single()

    if (error) throw error
    return transformFolderFromDB(data)
}

export async function renameFolder(id: string, name: string): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase
        .from('folders')
        .update({ name })
        .eq('id', id)

    if (error) throw error
}

export async function deleteFolder(id: string): Promise<void> {
    const supabase = await createClient()

    // Move projects inside this folder to the folder's parent
    const { data: folder } = await supabase
        .from('folders')
        .select('parent_id')
        .eq('id', id)
        .single()

    const parentId = folder?.parent_id || null

    // Move projects to parent folder
    await supabase
        .from('projects')
        .update({ folder_id: parentId })
        .eq('folder_id', id)

    // Delete the folder (subfolders cascade-delete)
    const { error } = await supabase
        .from('folders')
        .delete()
        .eq('id', id)

    if (error) throw error
}

export async function moveProjectsToFolder(projectIds: string[], folderId: string | null): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase
        .from('projects')
        .update({ folder_id: folderId })
        .in('id', projectIds)

    if (error) throw error
}

export async function moveFolder(id: string, newParentId: string | null): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase
        .from('folders')
        .update({ parent_id: newParentId })
        .eq('id', id)

    if (error) throw error
}
