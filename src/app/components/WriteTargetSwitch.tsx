import { ToggleGroup, ToggleGroupItem } from "@weeeha/ui/components/toggle-group";
import { Label } from "@weeeha/ui/components/label";

import { useEditorStore } from "@/state/editor-store";

export function WriteTargetSwitch() {
  const writeTarget = useEditorStore((s) => s.writeTarget);
  const setWriteTarget = useEditorStore((s) => s.setWriteTarget);

  return (
    <div className="flex items-center gap-2">
      <Label id="write-target-label">Writes to</Label>
      <ToggleGroup
        type="single"
        aria-labelledby="write-target-label"
        value={writeTarget}
        onValueChange={(value) => {
          if (value) setWriteTarget(value as "set" | "shot");
        }}
        variant="outline"
      >
        <ToggleGroupItem value="set">Set</ToggleGroupItem>
        <ToggleGroupItem value="shot">This shot</ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
