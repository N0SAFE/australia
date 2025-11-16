import { Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/shadcn/card";

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-muted-foreground" />
          <CardTitle>Validating Invitation</CardTitle>
          <CardDescription>
            Please wait while we validate your invitation token...
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
