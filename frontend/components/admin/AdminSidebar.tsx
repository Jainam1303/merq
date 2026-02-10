"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Users,
    LineChart,
    CreditCard,
    DollarSign,
    Terminal,
    Megaphone,
    FileCode,
    Settings,
    Shield,
    Gift
} from "lucide-react";

const links = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Users", href: "/admin/users", icon: Users },
    { label: "Trades", href: "/admin/trades", icon: LineChart },
    { label: "Plans", href: "/admin/plans", icon: CreditCard },
    { label: "Revenue", href: "/admin/revenue", icon: DollarSign },
    { label: "Referrals", href: "/admin/referrals", icon: Gift },
    { label: "System", href: "/admin/system", icon: Terminal },
    { label: "Announcements", href: "/admin/announcements", icon: Megaphone },
    { label: "Audit Logs", href: "/admin/logs", icon: FileCode },
    // { label: "Settings", href: "/admin/settings", icon: Settings },
];

export function AdminSidebar({ className }: { className?: string }) {
    const pathname = usePathname();

    return (
        <div className={cn("pb-12 min-h-screen bg-card border-r w-64 hidden lg:block", className)}>
            <div className="space-y-4 py-4">
                <div className="px-3 py-2">
                    <h2 className="mb-2 px-4 text-lg font-bold flex items-center gap-2">
                        <Shield className="w-6 h-6 text-primary" />
                        Admin Panel
                    </h2>
                    <div className="space-y-1">
                        {links.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground",
                                    (link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href))
                                        ? "bg-accent text-accent-foreground"
                                        : "text-muted-foreground"
                                )}
                            >
                                <link.icon className="w-4 h-4" />
                                {link.label}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
