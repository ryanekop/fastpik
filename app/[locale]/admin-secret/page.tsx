'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CheckCircle, XCircle, User, Mail, Lock, Key, Eye, EyeOff, Trash2, RefreshCw, Plus, Users, Calendar, Crown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ThemeToggle } from '@/components/theme-toggle'
import { LanguageToggle } from '@/components/language-toggle'
import { useTranslations } from 'next-intl'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

interface UserData {
    id: string
    email: string
    name: string
    createdAt: string
    tier: string
    status: string
    expiresAt: string | null
}

export default function SecretAdminPage() {
    const t = useTranslations('AdminSecret')

    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [secretKey, setSecretKey] = useState('')
    const [authError, setAuthError] = useState('')

    // Form states
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [trialDays, setTrialDays] = useState('3')

    // Status states
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<{ success: boolean; message: string; user?: any } | null>(null)

    // Users list
    const [users, setUsers] = useState<UserData[]>([])
    const [loadingUsers, setLoadingUsers] = useState(false)
    const [showCreateForm, setShowCreateForm] = useState(false)

    // Dialog states
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; user: UserData | null }>({ open: false, user: null })
    const [editDialog, setEditDialog] = useState<{ open: boolean; user: UserData | null }>({ open: false, user: null })
    const [expiryDate, setExpiryDate] = useState('')
    const [selectedTier, setSelectedTier] = useState('')

    const fetchUsers = useCallback(async () => {
        setLoadingUsers(true)
        try {
            const res = await fetch('/api/admin/users', {
                headers: { 'x-admin-secret': secretKey }
            })
            const data = await res.json()
            if (data.success) {
                setUsers(data.users)
            }
        } catch (error) {
            console.error('Failed to fetch users:', error)
        } finally {
            setLoadingUsers(false)
        }
    }, [secretKey])

    useEffect(() => {
        if (isAuthenticated) {
            fetchUsers()
        }
    }, [isAuthenticated, fetchUsers])

    const handleAuth = (e: React.FormEvent) => {
        e.preventDefault()
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
                body: JSON.stringify({ name, email, password, secretKey, trialDays: parseInt(trialDays) })
            })

            const data = await res.json()
            setResult(data)

            if (data.success) {
                setName('')
                setEmail('')
                setPassword('')
                setShowCreateForm(false)
                fetchUsers()
            }
        } catch (error: any) {
            setResult({ success: false, message: error.message || 'Failed to create user' })
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteUser = async () => {
        if (!deleteDialog.user) return
        setLoading(true)

        try {
            const res = await fetch('/api/admin/users', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-secret': secretKey
                },
                body: JSON.stringify({ userId: deleteDialog.user.id })
            })

            const data = await res.json()
            if (data.success) {
                fetchUsers()
                setDeleteDialog({ open: false, user: null })
            } else {
                alert(data.message)
            }
        } catch (error: any) {
            alert(error.message)
        } finally {
            setLoading(false)
        }
    }

    const handleSetExpiry = async () => {
        if (!editDialog.user || !expiryDate) return
        setLoading(true)

        try {
            const res = await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-secret': secretKey
                },
                body: JSON.stringify({
                    userId: editDialog.user.id,
                    action: 'set_expiry',
                    expiryDate: new Date(expiryDate).toISOString()
                })
            })

            const data = await res.json()
            if (data.success) {
                fetchUsers()
                setEditDialog({ open: false, user: null })
            } else {
                alert(data.message)
            }
        } catch (error: any) {
            alert(error.message)
        } finally {
            setLoading(false)
        }
    }

    const handleChangeTier = async () => {
        if (!editDialog.user || !selectedTier) return
        setLoading(true)

        try {
            const res = await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-secret': secretKey
                },
                body: JSON.stringify({
                    userId: editDialog.user.id,
                    action: 'change_tier',
                    tier: selectedTier
                })
            })

            const data = await res.json()
            if (data.success) {
                fetchUsers()
                setEditDialog({ open: false, user: null })
            } else {
                alert(data.message)
            }
        } catch (error: any) {
            alert(error.message)
        } finally {
            setLoading(false)
        }
    }

    const getTierBadge = (tier: string, status?: string) => {
        // Check if it's a trial based on tier or status
        if (tier === 'free' || status === 'trial') {
            return <Badge variant="secondary">⏱️ Trial</Badge>
        }
        switch (tier) {
            case 'pro_monthly':
                return <Badge className="bg-blue-500">🔥 Pro Monthly</Badge>
            case 'pro_quarterly':
                return <Badge className="bg-purple-500">🔥 Pro Quarterly</Badge>
            case 'pro_yearly':
                return <Badge className="bg-orange-500">🔥 Pro Yearly</Badge>
            case 'lifetime':
                return <Badge className="bg-amber-500">👑 Lifetime</Badge>
            default:
                return <Badge variant="outline">No Plan</Badge>
        }
    }

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '—'
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        })
    }

    const isExpired = (dateString: string | null) => {
        if (!dateString) return false
        return new Date(dateString) < new Date()
    }

    // Auth screen
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <div className="fixed top-4 right-4 flex items-center gap-2">
                    <LanguageToggle />
                    <ThemeToggle />
                </div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md"
                >
                    <Card>
                        <CardHeader className="text-center">
                            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                                <Key className="h-6 w-6 text-primary" />
                            </div>
                            <CardTitle>{t('enterSecretKey')}</CardTitle>
                            <CardDescription>{t('enterKeyDesc')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleAuth} className="space-y-4">
                                <div className="space-y-2">
                                    <Input
                                        type="password"
                                        placeholder={t('secretKeyPlaceholder')}
                                        value={secretKey}
                                        onChange={(e) => setSecretKey(e.target.value)}
                                    />
                                    {authError && (
                                        <p className="text-xs text-destructive">{t('invalidKey')}</p>
                                    )}
                                </div>
                                <Button type="submit" className="w-full cursor-pointer">
                                    <Lock className="h-4 w-4 mr-2" />
                                    {t('unlock')}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        )
    }

    // Main admin dashboard
    return (
        <div className="min-h-screen bg-background p-4">
            <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
                <LanguageToggle />
                <ThemeToggle />
            </div>

            <div className="max-w-6xl mx-auto pt-8 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Users className="h-6 w-6" />
                            {t('userManagement')}
                        </h1>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={fetchUsers} disabled={loadingUsers} className="cursor-pointer">
                            <RefreshCw className={`h-4 w-4 mr-2 ${loadingUsers ? 'animate-spin' : ''}`} />
                            {t('refresh')}
                        </Button>
                        <Button onClick={() => setShowCreateForm(!showCreateForm)} className="cursor-pointer">
                            <Plus className="h-4 w-4 mr-2" />
                            {t('newUser')}
                        </Button>
                    </div>
                </div>

                {/* Create User Form */}
                <AnimatePresence>
                    {showCreateForm && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                        >
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">{t('createTrialAccount')}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                        <div className="space-y-2">
                                            <Label>{t('name')}</Label>
                                            <Input
                                                placeholder="John Doe"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t('email')}</Label>
                                            <Input
                                                type="email"
                                                placeholder="user@example.com"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t('password')}</Label>
                                            <div className="relative">
                                                <Input
                                                    type={showPassword ? 'text' : 'password'}
                                                    placeholder="Min 6 chars"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    required
                                                    minLength={6}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                >
                                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t('trialDuration')}</Label>
                                            <Select value={trialDays} onValueChange={setTrialDays}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="1">1 {t('day')}</SelectItem>
                                                    <SelectItem value="2">2 {t('days')}</SelectItem>
                                                    <SelectItem value="3">3 {t('days')}</SelectItem>
                                                    <SelectItem value="5">5 {t('days')}</SelectItem>
                                                    <SelectItem value="7">7 {t('days')}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="opacity-0">.</Label>
                                            <Button type="submit" className="w-full cursor-pointer" disabled={loading}>
                                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('create')}
                                            </Button>
                                        </div>
                                    </form>
                                    {result && (
                                        <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${result.success ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                                            {result.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                                            {result.message}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Users Table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Crown className="h-5 w-5" />
                            {t('usersList')} ({users.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loadingUsers ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin" />
                            </div>
                        ) : users.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                {t('noUsers')}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('name')}</TableHead>
                                            <TableHead>{t('email')}</TableHead>
                                            <TableHead>{t('plan')}</TableHead>
                                            <TableHead>{t('expires')}</TableHead>
                                            <TableHead>{t('registered')}</TableHead>
                                            <TableHead className="text-right">{t('actions')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {users.map((user) => (
                                            <TableRow key={user.id}>
                                                <TableCell className="font-medium">{user.name}</TableCell>
                                                <TableCell>{user.email}</TableCell>
                                                <TableCell>{getTierBadge(user.tier)}</TableCell>
                                                <TableCell>
                                                    {user.tier === 'lifetime' ? (
                                                        <span className="text-amber-500">∞ {t('never')}</span>
                                                    ) : (
                                                        <span className={isExpired(user.expiresAt) ? 'text-red-500' : ''}>
                                                            {formatDate(user.expiresAt)}
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell>{formatDate(user.createdAt)}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setEditDialog({ open: true, user })
                                                                setSelectedTier(user.tier === 'free' ? 'free' : user.tier)
                                                                // Set expiry date to current value or default to today + 15 days
                                                                const defaultDate = user.expiresAt
                                                                    ? new Date(user.expiresAt).toISOString().split('T')[0]
                                                                    : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                                                                setExpiryDate(defaultDate)
                                                            }}
                                                            className="cursor-pointer"
                                                        >
                                                            <Calendar className="h-3 w-3 mr-1" />
                                                            Edit
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={() => setDeleteDialog({ open: true, user })}
                                                            className="cursor-pointer"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <p className="text-center text-xs text-muted-foreground">
                    📱 Mobile-friendly • 🔒 Admin access only
                </p>
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete User</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete <strong>{deleteDialog.user?.name}</strong> ({deleteDialog.user?.email})?
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialog({ open: false, user: null })} className="cursor-pointer">
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteUser} disabled={loading} className="cursor-pointer">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit User Dialog */}
            <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ ...editDialog, open })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Subscription</DialogTitle>
                        <DialogDescription>
                            Modify subscription for <strong>{editDialog.user?.name}</strong>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {/* Set Expiry Date */}
                        <div className="space-y-2">
                            <Label>Masa Berlaku Berakhir</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="date"
                                    value={expiryDate}
                                    onChange={(e) => setExpiryDate(e.target.value)}
                                />
                                <Button onClick={handleSetExpiry} disabled={loading || !expiryDate} className="cursor-pointer">
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Simpan'}
                                </Button>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">Atau</span>
                            </div>
                        </div>

                        {/* Change Tier */}
                        <div className="space-y-2">
                            <Label>Ganti Paket</Label>
                            <div className="flex gap-2">
                                <Select value={selectedTier} onValueChange={setSelectedTier}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih paket" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="free">⏱️ Trial (15 hari)</SelectItem>
                                        <SelectItem value="pro_monthly">🔥 Pro Monthly</SelectItem>
                                        <SelectItem value="pro_quarterly">🔥 Pro Quarterly</SelectItem>
                                        <SelectItem value="pro_yearly">🔥 Pro Yearly</SelectItem>
                                        <SelectItem value="lifetime">👑 Lifetime</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button onClick={handleChangeTier} disabled={loading || !selectedTier} className="cursor-pointer">
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ganti'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
