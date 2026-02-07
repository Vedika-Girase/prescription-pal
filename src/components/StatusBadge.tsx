import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-warning/15 text-warning border-warning/30" },
  ready: { label: "Ready", className: "bg-success/15 text-success border-success/30" },
  given: { label: "Given", className: "bg-primary/15 text-primary border-primary/30" },
  taken: { label: "Taken", className: "bg-success/15 text-success border-success/30" },
  missed: { label: "Missed", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: "" };

  return (
    <Badge variant="outline" className={cn("font-medium", config.className, className)}>
      {config.label}
    </Badge>
  );
}
