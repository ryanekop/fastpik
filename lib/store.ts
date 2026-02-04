import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useEffect, useState } from 'react'

interface SelectionState {
    selected: string[]
    projectId: string | null
    _hasHydrated: boolean
    toggleSelection: (id: string, max: number) => void
    clearSelection: () => void
    setSelection: (ids: string[]) => void
    setProjectId: (id: string) => void
    setHasHydrated: (state: boolean) => void
}

export const useSelectionStore = create<SelectionState>()(
    persist(
        (set, get) => ({
            selected: [],
            projectId: null,
            _hasHydrated: false,
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
            setHasHydrated: (state) => set({ _hasHydrated: state }),
        }),
        {
            name: 'fastpik-selection', // localStorage key
            partialize: (state) => ({
                selected: state.selected,
                projectId: state.projectId
            }),
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true)
            },
        }
    )
)

// Hook to wait for hydration - use this in components that depend on persisted state
export function useStoreHydration() {
    const [hydrated, setHydrated] = useState(useSelectionStore.getState()._hasHydrated)

    useEffect(() => {
        const unsubscribe = useSelectionStore.subscribe(
            (state) => {
                if (state._hasHydrated && !hydrated) {
                    setHydrated(true)
                }
            }
        )

        // Check immediately in case already hydrated
        if (useSelectionStore.getState()._hasHydrated) {
            setHydrated(true)
        }

        return unsubscribe
    }, [hydrated])

    return hydrated
}
