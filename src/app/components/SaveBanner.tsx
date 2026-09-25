import { Alert, AlertTitle, AlertDescription, AlertAction } from "@weeeha/ui/components/alert";
import { Button } from "@weeeha/ui/components/button";
import { TriangleAlert, Download } from "lucide-react";

import { exportProjectJson, exportFileName } from "@/storage/export-import";
import type { Project } from "@/domain/types";

function downloadProject(project: Project) {
  const blob = exportProjectJson(project);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = exportFileName(project);
  link.click();
  URL.revokeObjectURL(url);
}

export function SaveBanner({ project, failures }: { project: Project; failures: number }) {
  return (
    <Alert variant="destructive" className="rounded-none border-x-0 border-t-0">
      <TriangleAlert />
      <AlertTitle>Changes are not being saved</AlertTitle>
      <AlertDescription>
        {failures} save attempts have failed in a row. Export a backup while this is
        unresolved.
      </AlertDescription>
      <AlertAction>
        <Button size="sm" variant="outline" onClick={() => downloadProject(project)}>
          <Download />
          Export
        </Button>
      </AlertAction>
    </Alert>
  );
}
