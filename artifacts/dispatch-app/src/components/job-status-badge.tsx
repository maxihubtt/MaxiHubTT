import { JobStatus } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";

export function JobStatusBadge({ status }: { status: JobStatus }) {
  if (status === JobStatus.pending) {
    return (
      <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20 font-mono uppercase tracking-wider">
        Pending
      </Badge>
    );
  }
  if (status === JobStatus.claimed) {
    return (
      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-mono uppercase tracking-wider">
        Claimed
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-muted text-muted-foreground border-muted font-mono uppercase tracking-wider">
      Completed
    </Badge>
  );
}
