import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";

import "../globals.css";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { ThemeProvider } from "@/components/theme-provider"
import { getTenantConfig } from "@/lib/tenant-config"
import { TenantProvider } from "@/lib/tenant-context"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantConfig()
  const ogImage = tenant.logoUrl && tenant.logoUrl.startsWith('http')
    ? tenant.logoUrl
    : '/fastpik-logo.png'
  return {
    title: {
      default: `${tenant.name} - Photo Culling`,
      template: `%s - ${tenant.name}`,
    },
    description: "Select your photos quickly and easily.",
    icons: {
      icon: tenant.faviconUrl
        ? [{ url: tenant.faviconUrl }]
        : [
          { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      apple: tenant.faviconUrl || '/apple-touch-icon.png',
    },
    openGraph: {
      title: `${tenant.name} - Photo Culling`,
      description: 'Select your photos quickly and easily.',
      images: [{ url: ogImage }],
    },
  }
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params; // Await params for Next.js 15+
  const messages = await getMessages();
  const tenant = await getTenantConfig();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased transition-colors duration-300`}
        style={tenant.primaryColor ? { '--tenant-primary': tenant.primaryColor } as React.CSSProperties : undefined}
      >
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
          >
            <TenantProvider tenant={{
              id: tenant.id,
              slug: tenant.slug,
              name: tenant.name,
              domain: tenant.domain || '',
              logoUrl: tenant.logoUrl || '/fastpik-logo.png',
              faviconUrl: tenant.faviconUrl || '',
              primaryColor: tenant.primaryColor || '',
              footerText: tenant.footerText || '',
            }}>
              {children}
            </TenantProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
        <Script
          defer
          src="https://umami.ryanekoapp.web.id/script.js"
          data-website-id="14ffd81f-07b2-4cc0-b72b-7b8aa4e864a0"
          strategy="afterInteractive"
        />
        <Script
          defer
          src="https://umami.ryanekoapp.web.id/recorder.js"
          data-website-id="14ffd81f-07b2-4cc0-b72b-7b8aa4e864a0"
          data-sample-rate="0.15"
          data-mask-level="moderate"
          data-max-duration="300000"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
