import { useState } from "react";
import { Edit2, X, Check, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
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
  onDismissPosition?: (id: string) => void;  // Layer 2: Manual dismiss for stale positions
}

// Mobile Position Card Component
function PositionCard({
  position,
  onEdit,
  onExit,
  onDismiss,
  onUpdate,
  isEditing,
  editValues,
  setEditValues,
  onSave,
  onCancel
}: {
  position: Position;
  onEdit: () => void;
  onExit: () => void;
  onDismiss: () => void;
  onUpdate: (tp: number, sl: number) => void;
  isEditing: boolean;
  editValues: { tp: string; sl: string };
  setEditValues: (values: { tp: string; sl: string }) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);

  const handleExitClick = () => {
    if (confirmExit) {
      onExit();
      setConfirmExit(false);
    } else {
      setConfirmExit(true);
      setTimeout(() => setConfirmExit(false), 3000);
    }
  };

  const isProfitable = parseFloat(String(position.pnl ?? 0)) >= 0;

  return (
    <div className={cn(
      "rounded-xl border transition-all duration-200 overflow-hidden bg-card",
      isProfitable
        ? "border-profit/30"
        : "border-loss/30"
    )}>
      {/* Main Card Content */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left flex items-center gap-3"
      >
        {/* Symbol & Type */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-foreground truncate">{position.symbol}</span>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] shrink-0",
                position.type === 'BUY'
                  ? "border-profit/50 bg-profit/10 text-profit"
                  : "border-loss/50 bg-loss/10 text-loss"
              )}
            >
              {position.type}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {position.qty} @ ₹{parseFloat(String(position.entry ?? 0)).toFixed(2)} • {position.time}
          </div>
          {/* Live LTP Display */}
          {position.ltp && position.ltp > 0 && (
            <div className={cn(
              "text-xs font-mono mt-1",
              position.ltp >= position.entry ? "text-profit" : "text-loss"
            )}>
              LTP: ₹{position.ltp.toFixed(2)}
            </div>
          )}
        </div>

        {/* P&L */}
        <div className="text-right shrink-0">
          <div className={cn(
            "text-lg font-bold tabular-nums",
            isProfitable ? "text-profit" : "text-loss"
          )}>
            {isProfitable ? '+' : ''}₹{parseFloat(String(position.pnl ?? 0)).toFixed(2)}
          </div>
          <div className="flex items-center justify-end gap-1 text-muted-foreground">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      </button>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          {/* TP/SL Display or Edit */}
          {isEditing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Take Profit</label>
                  <Input
                    type="number"
                    value={editValues.tp}
                    onChange={(e) => setEditValues({ ...editValues, tp: e.target.value })}
                    className="bg-profit/5 border-profit/30 text-profit font-mono text-sm"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Stop Loss</label>
                  <Input
                    type="number"
                    value={editValues.sl}
                    onChange={(e) => setEditValues({ ...editValues, sl: e.target.value })}
                    className="bg-loss/5 border-loss/30 text-loss font-mono text-sm"
                    step="0.01"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={onCancel}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-primary"
                  onClick={onSave}
                >
                  <Check size={16} className="mr-1" /> Save
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex-1 grid grid-cols-2 gap-2 text-sm">
                <div className="px-3 py-2 rounded-lg bg-profit/5 border border-profit/20">
                  <div className="text-[10px] text-muted-foreground uppercase">TP</div>
                  <div className="font-mono text-profit">₹{Number(position.tp || 0).toFixed(2)}</div>
                </div>
                <div className="px-3 py-2 rounded-lg bg-loss/5 border border-loss/20">
                  <div className="text-[10px] text-muted-foreground uppercase">SL</div>
                  <div className="font-mono text-loss">₹{Number(position.sl || 0).toFixed(2)}</div>
                </div>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10"
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
              >
                <Edit2 size={18} />
              </Button>
            </div>
          )}

          {/* Exit and Dismiss Buttons */}
          <div className="flex gap-2">
            {/* Dismiss Button - removes stale position without exit order */}
            <Button
              variant="outline"
              className="flex-1 min-h-[44px] border-muted-foreground/30 text-muted-foreground hover:bg-muted hover:text-muted-foreground"
              onClick={(e) => { e.stopPropagation(); onDismiss(); }}
              title="Remove this position from dashboard (use if already exited from broker)"
            >
              Dismiss
            </Button>

            {/* Exit Button - places actual exit order */}
            <Button
              variant={confirmExit ? "destructive" : "outline"}
              className={cn(
                "flex-1 min-h-[44px]",
                !confirmExit && "border-loss/50 text-loss hover:bg-loss/10 hover:text-loss"
              )}
              onClick={(e) => { e.stopPropagation(); handleExitClick(); }}
            >
              <X size={18} className="mr-2" />
              {confirmExit ? 'CONFIRM' : 'Exit'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ActivePositions({
  positions = [],
  onSquareOffAll,
  onExitPosition,
  onUpdatePosition,
  onDismissPosition
}: ActivePositionsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ tp: string; sl: string }>({ tp: '', sl: '' });
  const [confirmSquareOff, setConfirmSquareOff] = useState(false);

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

  const handleSquareOffAll = () => {
    if (confirmSquareOff) {
      onSquareOffAll?.();
      setConfirmSquareOff(false);
    } else {
      setConfirmSquareOff(true);
      setTimeout(() => setConfirmSquareOff(false), 3000);
    }
  };

  const totalPnl = positions.reduce((sum, p) => sum + (Number(p.pnl) || 0), 0);

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-lg">Active Positions</CardTitle>
          {positions.length > 0 && (
            <div className={cn(
              "text-sm font-bold mt-1",
              totalPnl >= 0 ? "text-profit" : "text-loss"
            )}>
              Total: {parseFloat(String(totalPnl ?? 0)) >= 0 ? '+' : ''}₹{parseFloat(String(totalPnl ?? 0)).toFixed(2)}
            </div>
          )}
        </div>
        {positions.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleSquareOffAll}
            className={cn(
              "min-h-[40px]",
              !confirmSquareOff && "border-loss/50 text-loss hover:bg-loss/10 bg-transparent"
            )}
          >
            <AlertTriangle size={14} className="mr-1" />
            {confirmSquareOff ? 'CONFIRM' : 'Exit All'}
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {positions.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No active positions
          </div>
        ) : (
          <>
            {/* Mobile/Tablet View - Cards */}
            <div className="xl:hidden space-y-3">
              {positions.map((position) => (
                <PositionCard
                  key={position.id}
                  position={position}
                  onEdit={() => startEditing(position)}
                  onExit={() => onExitPosition?.(position.id)}
                  onDismiss={() => onDismissPosition?.(position.id)}
                  onUpdate={(tp, sl) => onUpdatePosition?.(position.id, tp, sl)}
                  isEditing={editingId === position.id}
                  editValues={editValues}
                  setEditValues={setEditValues}
                  onSave={() => saveEdit(position.id)}
                  onCancel={cancelEdit}
                />
              ))}
            </div>

            {/* Desktop View - Table */}
            <div className="hidden xl:block overflow-x-auto">
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground w-20">Time</TableHead>
                    <TableHead className="text-muted-foreground w-32">Symbol</TableHead>
                    <TableHead className="text-muted-foreground w-20">Type</TableHead>
                    <TableHead className="text-right text-muted-foreground w-16">Qty</TableHead>
                    <TableHead className="text-right text-muted-foreground w-24">Entry</TableHead>
                    <TableHead className="text-right text-muted-foreground w-24">LTP</TableHead>
                    <TableHead className="text-right text-muted-foreground w-28">TP</TableHead>
                    <TableHead className="text-right text-muted-foreground w-28">SL</TableHead>
                    <TableHead className="text-right text-muted-foreground w-24">P&L</TableHead>
                    <TableHead className="text-right text-muted-foreground w-28">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positions.map((position) => (
                    <TableRow key={position.id} className="border-border">
                      <TableCell className="font-mono text-sm">{position.time}</TableCell>
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
                      <TableCell className="text-right font-mono">₹{Number(position.entry || 0).toFixed(2)}</TableCell>
                      <TableCell className={cn(
                        "text-right font-mono font-medium",
                        (position.ltp ?? 0) >= position.entry ? "text-profit" : "text-loss"
                      )}>
                        {position.ltp && position.ltp > 0 ? `₹${position.ltp.toFixed(2)}` : '-'}
                      </TableCell>
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
                          <span className="font-mono text-profit">₹{Number(position.tp || 0).toFixed(2)}</span>
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
                          <span className="font-mono text-loss">₹{Number(position.sl || 0).toFixed(2)}</span>
                        )}
                      </TableCell>
                      <TableCell className={cn(
                        "text-right font-mono font-medium",
                        Number(position.pnl) >= 0 ? "text-profit" : "text-loss"
                      )}>
                        {Number(position.pnl) >= 0 ? '+' : ''}₹{Number(position.pnl || 0).toFixed(2)}
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
                                title="Edit TP/SL"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-muted-foreground hover:bg-muted hover:text-muted-foreground"
                                onClick={() => onDismissPosition && onDismissPosition(position.id)}
                                title="Dismiss (use if already exited from broker)"
                              >
                                Dismiss
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-loss hover:bg-loss/10 hover:text-loss"
                                onClick={() => onExitPosition && onExitPosition(position.id)}
                                title="Exit (places exit order)"
                              >
                                Exit
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
