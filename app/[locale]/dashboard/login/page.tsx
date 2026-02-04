
import { LoginForm } from "@/components/admin/login-form"

export default function LoginPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
            <div className="w-full max-w-sm">
                <LoginForm />
            </div>
        </div>
    )
}
