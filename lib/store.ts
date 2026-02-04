import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SelectionState {
    selected: string[]
    projectId: string | null
    toggleSelection: (id: string, max: number) => void
    clearSelection: () => void
    setSelection: (ids: string[]) => void
    setProjectId: (id: string) => void
}

export const useSelectionStore = create<SelectionState>()(
    persist(
        (set, get) => ({
            selected: [],
            projectId: null,
            toggleSelection: (id, max) => set((state) => {
                const isSelected = state.selected.includes(id)
                if (isSelected) {
                    return { selected: state.selected.filter((item) => item !== id) }
                } else {
                    if (state.selected.length >= max) return state
                    return { selected: [...state.selected, id] }
                }
            }),
            clearSelection: () => set({ selected: [] }),
            setSelection: (ids) => set({ selected: ids }),
            setProjectId: (id) => {
                const currentProjectId = get().projectId
                // If switching to a different project, clear selection
                if (currentProjectId && currentProjectId !== id) {
                    set({ selected: [], projectId: id })
                } else {
                    set({ projectId: id })
                }
            },
        }),
        {
            name: 'fastpik-selection', // localStorage key
            partialize: (state) => ({
                selected: state.selected,
                projectId: state.projectId
            }),
        }
    )
)
