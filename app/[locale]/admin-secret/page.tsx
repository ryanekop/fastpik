'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CheckCircle, XCircle, User, Mail, Lock, Key, Eye, EyeOff } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function SecretAdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [secretKey, setSecretKey] = useState('')
    const [authError, setAuthError] = useState('')

    // Form states
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)

    // Status states
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<{ success: boolean; message: string; user?: any } | null>(null)

    const handleAuth = (e: React.FormEvent) => {
        e.preventDefault()
        // Simple client-side check - real validation happens on API
        if (secretKey.trim()) {
            setIsAuthenticated(true)
            setAuthError('')
        } else {
            setAuthError('Please enter the secret key')
        }
    }

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setResult(null)

        try {
            const res = await fetch('/api/admin/create-trial-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    email,
                    password,
                    secretKey
                })
            })

            const data = await res.json()
            setResult(data)

            if (data.success) {
                // Clear form on success
                setName('')
                setEmail('')
                setPassword('')
            }
        } catch (error: any) {
            setResult({
                success: false,
                message: error.message || 'Failed to create user'
            })
        } finally {
            setLoading(false)
        }
    }

    // Auth screen
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-sm"
                >
                    <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
                        <CardHeader className="text-center">
                            <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                                <Key className="h-6 w-6 text-amber-500" />
                            </div>
                            <CardTitle className="text-white">Admin Access</CardTitle>
                            <CardDescription className="text-slate-400">
                                Enter secret key to continue
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleAuth} className="space-y-4">
                                <div className="space-y-2">
                                    <Input
                                        type="password"
                                        placeholder="Secret Key"
                                        value={secretKey}
                                        onChange={(e) => setSecretKey(e.target.value)}
                                        className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                                    />
                                    {authError && (
                                        <p className="text-xs text-red-400">{authError}</p>
                                    )}
                                </div>
                                <Button type="submit" className="w-full cursor-pointer">
                                    <Lock className="h-4 w-4 mr-2" />
                                    Unlock
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        )
    }

    // Main admin form
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
            <div className="max-w-md mx-auto pt-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                    <User className="h-5 w-5 text-emerald-500" />
                                </div>
                                <div>
                                    <CardTitle className="text-white">Create Trial User</CardTitle>
                                    <CardDescription className="text-slate-400">
                                        Register new trial account (15 days)
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleCreateUser} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-slate-300">Full Name</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <Input
                                            id="name"
                                            type="text"
                                            placeholder="John Doe"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-slate-300">Email</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="user@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password" className="text-slate-300">Password</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <Input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Min 6 characters"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="pl-10 pr-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                                            required
                                            minLength={6}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full cursor-pointer"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <User className="h-4 w-4 mr-2" />
                                            Create User
                                        </>
                                    )}
                                </Button>
                            </form>

                            {/* Result */}
                            <AnimatePresence>
                                {result && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className={`mt-4 p-4 rounded-lg ${result.success
                                                ? 'bg-emerald-500/20 border border-emerald-500/30'
                                                : 'bg-red-500/20 border border-red-500/30'
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            {result.success ? (
                                                <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                                            ) : (
                                                <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                                            )}
                                            <div>
                                                <p className={`font-medium ${result.success ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {result.success ? 'Success!' : 'Error'}
                                                </p>
                                                <p className="text-sm text-slate-300 mt-1">
                                                    {result.message}
                                                </p>
                                                {result.user && (
                                                    <div className="mt-2 text-xs text-slate-400 font-mono bg-slate-700/50 p-2 rounded">
                                                        ID: {result.user.id}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </CardContent>
                    </Card>

                    {/* Instructions */}
                    <p className="text-center text-xs text-slate-500 mt-4">
                        📱 Mobile-friendly • 🔒 Secret access only
                    </p>
                </motion.div>
            </div>
        </div>
    )
}
