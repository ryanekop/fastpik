'use client'

import { createContext, useContext, ReactNode } from 'react'

// =============================================
// Client-side Tenant Context
// Receives tenant config from server layout → provides to client components
// =============================================

export interface ClientTenantConfig {
    id: string
    slug: string
    name: string
    domain: string
    logoUrl: string
    faviconUrl: string
    primaryColor: string
    footerText: string
}

const DEFAULT_TENANT: ClientTenantConfig = {
    id: 'default',
    slug: 'fastpik',
    name: 'Fastpik',
    domain: '',
    logoUrl: '/fastpik-logo.png',
    faviconUrl: '',
    primaryColor: '#7c3aed',
    footerText: '',
}

const TenantContext = createContext<ClientTenantConfig>(DEFAULT_TENANT)

export function TenantProvider({
    tenant,
    children,
}: {
    tenant: ClientTenantConfig
    children: ReactNode
}) {
    return (
        <TenantContext.Provider value={tenant}>
            {children}
        </TenantContext.Provider>
    )
}

export function useTenant(): ClientTenantConfig {
    return useContext(TenantContext)
}
