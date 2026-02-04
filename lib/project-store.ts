import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Project {
    id: string
    clientName: string
    gdriveLink: string
    clientWhatsapp: string   // WhatsApp klien (untuk kirim link)
    adminWhatsapp: string    // WhatsApp admin (untuk terima hasil pilihan)
    countryCode: string
    maxPhotos: number
    password?: string
    detectSubfolders: boolean
    expiresAt?: number // Unix timestamp, undefined = never expires
    createdAt: number
    link: string
    lockedPhotos?: string[] // List of previously selected photo filenames
    // Legacy support for old projects
    whatsapp?: string
}

interface ProjectStore {
    projects: Project[]
    addProject: (project: Project) => void
    removeProject: (id: string) => void
    removeMultipleProjects: (ids: string[]) => void
    updateProject: (id: string, project: Project) => void
    getProject: (id: string) => Project | undefined
    clearAllProjects: () => void
}

// Generate short unique ID
export function generateShortId(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
    let id = ''
    for (let i = 0; i < 12; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return id
}

export const useProjectStore = create<ProjectStore>()(
    persist(
        (set, get) => ({
            projects: [],

            addProject: (project) => set((state) => ({
                projects: [project, ...state.projects]
            })),

            removeProject: (id) => {
                set((state) => ({
                    projects: state.projects.filter(p => p.id !== id)
                }))
            },

            removeMultipleProjects: (ids) => {
                set((state) => ({
                    projects: state.projects.filter(p => !ids.includes(p.id))
                }))
            },

            updateProject: (id, updatedProject) => {
                set((state) => ({
                    projects: state.projects.map(p =>
                        p.id === id ? updatedProject : p
                    )
                }))
            },

            getProject: (id) => {
                return get().projects.find(p => p.id === id)
            },

            clearAllProjects: () => set({ projects: [] })
        }),
        {
            name: 'fastpik-projects', // localStorage key
        }
    )
)

// Helper to check if project is expired
export function isProjectExpired(project: Project): boolean {
    if (!project.expiresAt) return false // No expiration
    return Date.now() > project.expiresAt
}

// Helper to format remaining time
export function formatExpiryTime(expiresAt: number | undefined): string {
    if (!expiresAt) return "♾️ Selamanya"

    const now = Date.now()
    const diff = expiresAt - now

    if (diff <= 0) return "⏰ Expired"

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (days > 0) return `${days} hari ${hours} jam`
    if (hours > 0) return `${hours} jam`
    return "< 1 jam"
}

// Helper to get client WhatsApp (with legacy support)
export function getClientWhatsapp(project: Project): string {
    return project.clientWhatsapp || project.whatsapp || ''
}

// Helper to get admin WhatsApp (with legacy support)
export function getAdminWhatsapp(project: Project): string {
    return project.adminWhatsapp || project.whatsapp || ''
}
