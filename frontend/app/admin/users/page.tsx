"use client";

import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/api";
import { toast } from "sonner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, MoreHorizontal, UserCog, Ban, CheckCircle, FileText, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";

export default function UsersPage() {
    const router = useRouter();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams({
                page: page.toString(),
                limit: "20",
                search: search
            });
            const res = await fetchJson(`/api/admin/users?${query.toString()}`);
            setUsers(res.users);
            setTotalPages(res.totalPages);
        } catch (e: any) {
            toast.error("Failed to load users");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeout = setTimeout(loadUsers, 300); // Debounce search
        return () => clearTimeout(timeout);
    }, [search, page]);

    const handleToggleStatus = async (user: any) => {
        if (!confirm(`Are you sure you want to ${user.is_active ? 'ban' : 'activate'} ${user.username}?`)) return;
        try {
            await fetchJson(`/api/admin/users/${user.id}/toggle`, { method: "POST" });
            toast.success(`User ${user.is_active ? 'banned' : 'activated'}`);
            loadUsers();
        } catch (e: any) {
            toast.error(e.message || "Action failed");
        }
    };

    const handleExport = () => {
        window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/admin/users/export`, '_blank');
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
                <Button variant="outline" onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" /> Export CSV
                </Button>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search users by name or email..."
                        className="pl-8"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Plan</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Roles</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24">Loading...</TableCell>
                            </TableRow>
                        ) : users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24">No users found.</TableCell>
                            </TableRow>
                        ) : (
                            users.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">{user.username}</TableCell>
                                    <TableCell>{user.email || '-'}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">{user.plan}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        {user.is_active ? (
                                            <Badge className="bg-emerald-500 hover:bg-emerald-600">Active</Badge>
                                        ) : (
                                            <Badge variant="destructive">Banned</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {user.is_admin && <Badge variant="outline" className="border-blue-500 text-blue-500">Admin</Badge>}
                                        {user.has_api_key && <Badge variant="outline" className="ml-2 border-amber-500 text-amber-500">API Key</Badge>}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => router.push(`/admin/users/${user.id}`)}>
                                                    <UserCog className="mr-2 h-4 w-4" /> View Details
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleToggleStatus(user)}>
                                                    {user.is_active ? (
                                                        <>
                                                            <Ban className="mr-2 h-4 w-4 text-red-500" /> <span className="text-red-500">Ban User</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <CheckCircle className="mr-2 h-4 w-4 text-emerald-500" /> Activate User
                                                        </>
                                                    )}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            <div className="flex items-center justify-end space-x-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                >
                    Previous
                </Button>
                <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                >
                    Next
                </Button>
            </div>
        </div>
    );
}
