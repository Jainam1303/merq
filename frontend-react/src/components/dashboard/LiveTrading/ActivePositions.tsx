import { useState, useEffect } from "react";
import { Edit2, X, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Position } from "@/data/mockData";
import { cn } from "@/lib/utils";

interface ActivePositionsProps {
  positions: Position[];
  onSquareOffAll?: () => void;
  onExitPosition?: (id: string) => void;
  onUpdatePosition?: (id: string, tp: number, sl: number) => void;
}

export function ActivePositions({
  positions = [],
  onSquareOffAll,
  onExitPosition,
  onUpdatePosition
}: ActivePositionsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ tp: string; sl: string }>({ tp: '', sl: '' });

  const startEditing = (position: Position) => {
    setEditingId(position.id);
    setEditValues({ tp: position.tp.toString(), sl: position.sl.toString() });
  };

  const saveEdit = (id: string) => {
    if (onUpdatePosition) {
      onUpdatePosition(id, parseFloat(editValues.tp), parseFloat(editValues.sl));
    }
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg">Active Positions</CardTitle>
        {positions.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={onSquareOffAll}
          >
            Square Off All
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground hidden md:table-cell w-20">Time</TableHead>
                <TableHead className="text-muted-foreground w-32">Symbol</TableHead>
                <TableHead className="text-muted-foreground w-20">Type</TableHead>
                <TableHead className="text-right text-muted-foreground w-16">Qty</TableHead>
                <TableHead className="text-right text-muted-foreground hidden md:table-cell w-24">Entry</TableHead>
                <TableHead className="text-right text-muted-foreground w-28">TP</TableHead>
                <TableHead className="text-right text-muted-foreground w-28">SL</TableHead>
                <TableHead className="text-right text-muted-foreground w-24">P&L</TableHead>
                <TableHead className="text-right text-muted-foreground w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                    No active positions
                  </TableCell>
                </TableRow>
              ) : (
                positions.map((position) => (
                  <TableRow key={position.id} className="border-border">
                    <TableCell className="font-mono text-sm hidden md:table-cell">{position.time}</TableCell>
                    <TableCell className="font-medium">{position.symbol}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          position.type === 'BUY'
                            ? "border-profit/50 bg-profit/10 text-profit"
                            : "border-loss/50 bg-loss/10 text-loss"
                        )}
                      >
                        {position.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{position.qty}</TableCell>
                    <TableCell className="text-right font-mono hidden md:table-cell">₹{position.entry.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      {editingId === position.id ? (
                        <Input
                          type="text"
                          value={editValues.tp}
                          onChange={(e) => setEditValues({ ...editValues, tp: e.target.value })}
                          className="h-7 w-full text-right text-sm font-mono bg-transparent border-primary/50 focus:border-primary px-2"
                          placeholder="TP"
                        />
                      ) : (
                        <span className="font-mono text-profit">₹{position.tp.toFixed(2)}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {editingId === position.id ? (
                        <Input
                          type="text"
                          value={editValues.sl}
                          onChange={(e) => setEditValues({ ...editValues, sl: e.target.value })}
                          className="h-7 w-full text-right text-sm font-mono bg-transparent border-loss/50 focus:border-loss px-2"
                          placeholder="SL"
                        />
                      ) : (
                        <span className="font-mono text-loss">₹{position.sl.toFixed(2)}</span>
                      )}
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-mono font-medium",
                      position.pnl >= 0 ? "text-profit" : "text-loss"
                    )}>
                      {position.pnl >= 0 ? '+' : ''}₹{position.pnl.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {editingId === position.id ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => saveEdit(position.id)}
                            >
                              <Check className="h-4 w-4 text-profit" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={cancelEdit}
                            >
                              <X className="h-4 w-4 text-loss" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => startEditing(position)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-loss hover:bg-loss/10 hover:text-loss"
                              onClick={() => onExitPosition && onExitPosition(position.id)}
                            >
                              Exit
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
