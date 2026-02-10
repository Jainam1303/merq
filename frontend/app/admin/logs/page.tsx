"use client";

import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/api";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function LogsPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams({ page: page.toString(), limit: "50" });
            const res = await fetchJson(`/api/admin/audit-logs?${query.toString()}`);
            setLogs(res.logs);
            setTotalPages(res.totalPages);
        } catch (e) { toast.error("Failed to load logs"); }
        finally { setLoading(false); }
    };

    useEffect(() => { loadLogs(); }, [page]);

    const handleExport = () => {
        window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/admin/audit-logs/export`, '_blank');
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
                <Button variant="outline" onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" /> Export CSV
                </Button>
            </div>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Admin</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>IP</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? <TableRow><TableCell colSpan={6} className="text-center h-24">Loading...</TableCell></TableRow> :
                        logs.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center h-24">No logs found</TableCell></TableRow> :
                            logs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell className="font-mono text-xs">{new Date(log.createdAt).toLocaleString()}</TableCell>
                                    <TableCell className="font-medium">{log.admin_username}</TableCell>
                                    <TableCell><Badge variant="outline">{log.action}</Badge></TableCell>
                                    <TableCell>{log.target_type} {log.target_id}</TableCell>
                                    <TableCell className="max-w-xs truncate text-xs text-muted-foreground" title={log.details}>
                                        {log.details}
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">{log.ip_address}</TableCell>
                                </TableRow>
                            ))}
                </TableBody>
            </Table>

            <div className="flex items-center justify-end space-x-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                <span>Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
            </div>
        </div>
    );
}
