import { Alert, AlertTitle, AlertDescription } from "@weeeha/ui/components/alert";
import { Lock } from "lucide-react";

export function ReadOnlyNotice() {
  return (
    <Alert className="rounded-none border-x-0 border-t-0">
      <Lock />
      <AlertTitle>Read-only</AlertTitle>
      <AlertDescription>
        This project is open in another tab. Changes here will not be saved.
      </AlertDescription>
    </Alert>
  );
}
