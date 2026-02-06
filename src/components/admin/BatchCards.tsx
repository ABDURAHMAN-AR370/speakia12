import { Users, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface BatchInfo {
  batchNumber: number;
  studentCount: number;
}

interface BatchCardsProps {
  batches: BatchInfo[];
  onSelectBatch: (batchNumber: number) => void;
}

export default function BatchCards({ batches, onSelectBatch }: BatchCardsProps) {
  if (batches.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No batches found
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {batches.map((batch) => (
        <Card 
          key={batch.batchNumber}
          className="cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => onSelectBatch(batch.batchNumber)}
        >
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-lg">
              <span>Batch {batch.batchNumber}</span>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <Badge variant="secondary">
                {batch.studentCount} {batch.studentCount === 1 ? 'Student' : 'Students'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
