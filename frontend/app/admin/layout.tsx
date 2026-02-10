"use client";

import "@/app/globals.css";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, User as UserIcon, Shield } from "lucide-react";
import { fetchJson } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const [authorized, setAuthorized] = useState(false);
    const [checking, setChecking] = useState(true);
    const [adminName, setAdminName] = useState("Admin");

    // Auth guard: verify the user is actually an admin
    useEffect(() => {
        const checkAdmin = async () => {
            try {
                const res = await fetchJson('/check_auth');
                if (!res.authenticated || !res.is_admin) {
                    router.replace('/dashboard');
                    return;
                }
                setAdminName(res.user || "Admin");
                setAuthorized(true);
            } catch (e) {
                router.replace('/');
            } finally {
                setChecking(false);
            }
        };
        checkAdmin();
    }, [router]);

    const handleLogout = async () => {
        try {
            await fetchJson('/logout', { method: 'POST' });
            router.push('/');
        } catch (e) {
            console.error('Logout failed:', e);
        }
    };

    // Show nothing while checking auth (prevents flash of admin content)
    if (checking) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-3">
                    <Shield className="h-10 w-10 text-primary animate-pulse" />
                    <p className="text-muted-foreground text-sm">Verifying admin access...</p>
                </div>
            </div>
        );
    }

    if (!authorized) return null;

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            <AdminSidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="flex h-16 items-center border-b bg-card px-6 justify-between">
                    <div className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">MerQPrime</span> · Admin Console
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-2 rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                                <span className="text-sm text-muted-foreground hidden md:inline">{adminName}</span>
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                                        {adminName.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Admin Account</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                                <UserIcon className="mr-2 h-4 w-4" />
                                User Dashboard
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                                <LogOut className="mr-2 h-4 w-4" />
                                Logout
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </header>
                <main className="flex-1 overflow-y-auto p-6">
                    {children}
                </main>
            </div>
            <Toaster />
        </div>
    );
}
