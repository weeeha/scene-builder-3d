import { useRef } from "react";
import type { ChangeEvent } from "react";
import { toast } from "sonner";

import { Button } from "@weeeha/ui/components/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@weeeha/ui/components/tooltip";
import { Download, Upload } from "lucide-react";

import { useDocumentStore } from "@/state/document-store";
import { exportProjectJson, exportFileName, importProjectJson } from "@/storage/export-import";
import { saveProject } from "@/storage/project-repo";

export function ExportImportButtons() {
  const project = useDocumentStore((s) => s.project);
  const readOnly = useDocumentStore((s) => s.readOnly);
  const applyTransient = useDocumentStore((s) => s.applyTransient);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    if (!project) return;
    const blob = exportProjectJson(project);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = exportFileName(project);
    link.click();
    URL.revokeObjectURL(url);
    applyTransient((draft) => {
      draft.lastExportedAt = new Date().toISOString();
    });
  };

  const handleImportChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const imported = await importProjectJson(file);
      await saveProject(imported);
      toast.success(`Imported as a new project: ${imported.name}`);
    } catch {
      toast.error("That file could not be imported.");
    }
  };

  // See UndoRedoButtons.tsx: @weeeha/ui's Tooltip needs a TooltipProvider
  // ancestor, and nothing higher in the tree mounts one.
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            aria-label="Export project"
            disabled={!project}
            onClick={handleExport}
          >
            <Download />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Export project</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            aria-label="Import project"
            disabled={readOnly}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Import project</TooltipContent>
      </Tooltip>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        disabled={readOnly}
        onChange={handleImportChange}
      />
    </TooltipProvider>
  );
}
