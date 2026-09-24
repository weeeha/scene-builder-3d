import { useDocumentStore } from "@/state/document-store";
import { useEditorStore } from "@/state/editor-store";
import { findScene, findShot } from "@/domain/lookup";
import { updateObject, deleteObject } from "@/state/object-actions";
import { updateShot, setShotLens } from "@/state/shot-actions";
import { editTargetFor } from "@/viewport/transform-commit";
import type { ObjectOverride, PoseName, Shot, ShotType } from "@/domain/types";

import { FieldRow, UnitInput } from "@/components/super-ai/field-row";
import { ResetAffordance } from "@/components/super-ai/reset-affordance";
import { ChoiceChip, ChoiceChips } from "@/components/super-ai/choice-chips";
import { Input } from "@weeeha/ui/components/input";
import { Switch } from "@weeeha/ui/components/switch";
import { Slider } from "@weeeha/ui/components/slider";
import { ToggleGroup, ToggleGroupItem } from "@weeeha/ui/components/toggle-group";
import { Button } from "@weeeha/ui/components/button";
import { Separator } from "@weeeha/ui/components/separator";
import { Trash2 } from "lucide-react";

const POSES: PoseName[] = ["stand", "walk", "run", "sit", "crouch", "point"];
const SHOT_TYPES: ShotType[] = ["WIDE", "MED", "CU", "POV"];

export function Inspector({
  page,
  sceneId,
  shotId,
}: {
  page: "scene" | "shot";
  sceneId: string;
  shotId: string | null;
}) {
  const project = useDocumentStore((s) => s.project);
  const apply = useDocumentStore((s) => s.apply);
  const readOnly = useDocumentStore((s) => s.readOnly);
  const selectedObjectId = useEditorStore((s) => s.selectedObjectId);
  const select = useEditorStore((s) => s.select);
  const writeTarget = useEditorStore((s) => s.writeTarget);

  if (!project) return null;
  const scene = findScene(project, sceneId);
  if (!scene) return null;

  const shot = shotId ? findShot(project, shotId)?.shot ?? null : null;
  const editTarget = editTargetFor(page, writeTarget, shotId);
  const selected = selectedObjectId
    ? scene.set.objects.find((object) => object.id === selectedObjectId) ?? null
    : null;
  const override = shot && selected ? shot.overrides[selected.id] : undefined;

  const commit = (patch: ObjectOverride) => {
    if (!selected) return;
    apply((draft) => {
      updateObject(draft, sceneId, selected.id, patch, editTarget);
    });
  };

  const handleDelete = () => {
    if (!selected) return;
    apply((draft) => {
      deleteObject(draft, sceneId, selected.id);
    });
    select(null);
  };

  return (
    <div className="flex flex-col gap-4">
      {page === "shot" && shot ? (
        <ShotFields shot={shot} sceneId={sceneId} shotId={shot.id} readOnly={readOnly} />
      ) : null}

      {selected ? (
        <>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{selected.name}</span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Delete ${selected.name}`}
              disabled={readOnly}
              onClick={handleDelete}
            >
              <Trash2 />
            </Button>
          </div>

          <FieldRow
            label="Position"
            reset={
              shot ? (
                <ResetAffordance
                  state={override?.transform ? "modified" : "default"}
                  onReset={() => commit({ transform: undefined })}
                  label="Reset position"
                />
              ) : undefined
            }
          >
            {() => (
              <div className="flex gap-1">
                <UnitInput
                  aria-label="Position X"
                  unit="m"
                  disabled={readOnly}
                  value={selected.transform.position[0]}
                  onValueChange={(x) =>
                    commit({
                      transform: {
                        ...selected.transform,
                        position: [
                          x,
                          selected.transform.position[1],
                          selected.transform.position[2],
                        ],
                      },
                    })
                  }
                />
                <UnitInput
                  aria-label="Position Y"
                  unit="m"
                  disabled={readOnly}
                  value={selected.transform.position[1]}
                  onValueChange={(y) =>
                    commit({
                      transform: {
                        ...selected.transform,
                        position: [
                          selected.transform.position[0],
                          y,
                          selected.transform.position[2],
                        ],
                      },
                    })
                  }
                />
                <UnitInput
                  aria-label="Position Z"
                  unit="m"
                  disabled={readOnly}
                  value={selected.transform.position[2]}
                  onValueChange={(z) =>
                    commit({
                      transform: {
                        ...selected.transform,
                        position: [
                          selected.transform.position[0],
                          selected.transform.position[1],
                          z,
                        ],
                      },
                    })
                  }
                />
              </div>
            )}
          </FieldRow>

          <FieldRow
            label="Rotation"
            reset={
              shot ? (
                <ResetAffordance
                  state={override?.transform ? "modified" : "default"}
                  onReset={() => commit({ transform: undefined })}
                  label="Reset rotation"
                />
              ) : undefined
            }
          >
            {(id) => (
              <UnitInput
                id={id}
                aria-label="Rotation Y"
                unit="deg"
                disabled={readOnly}
                value={(selected.transform.rotationY * 180) / Math.PI}
                onValueChange={(deg) =>
                  commit({
                    transform: { ...selected.transform, rotationY: (deg * Math.PI) / 180 },
                  })
                }
              />
            )}
          </FieldRow>

          <FieldRow
            label="Scale"
            reset={
              shot ? (
                <ResetAffordance
                  state={override?.transform ? "modified" : "default"}
                  onReset={() => commit({ transform: undefined })}
                  label="Reset scale"
                />
              ) : undefined
            }
          >
            {(id) => (
              <UnitInput
                id={id}
                aria-label="Scale"
                unit="x"
                disabled={readOnly}
                value={selected.transform.scale}
                onValueChange={(scale) =>
                  commit({ transform: { ...selected.transform, scale } })
                }
              />
            )}
          </FieldRow>

          <FieldRow
            label="Visible"
            reset={
              shot ? (
                <ResetAffordance
                  state={override?.visible !== undefined ? "modified" : "default"}
                  onReset={() => commit({ visible: undefined })}
                  label="Reset visibility"
                />
              ) : undefined
            }
          >
            {(id) => (
              <Switch
                id={id}
                checked={selected.visible}
                disabled={readOnly}
                onCheckedChange={(checked) => commit({ visible: checked })}
              />
            )}
          </FieldRow>

          {selected.kind === "doll" ? (
            <FieldRow
              label="Pose"
              reset={
                shot ? (
                  <ResetAffordance
                    state={override?.pose !== undefined ? "modified" : "default"}
                    onReset={() => commit({ pose: undefined })}
                    label="Reset pose"
                  />
                ) : undefined
              }
            >
              {() => (
                <ToggleGroup
                  type="single"
                  value={selected.pose}
                  onValueChange={(value) => value && commit({ pose: value as PoseName })}
                  variant="outline"
                >
                  {POSES.map((pose) => (
                    <ToggleGroupItem key={pose} value={pose}>
                      {pose}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              )}
            </FieldRow>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function ShotFields({
  shot,
  sceneId,
  shotId,
  readOnly,
}: {
  shot: Shot;
  sceneId: string;
  shotId: string;
  readOnly: boolean;
}) {
  const apply = useDocumentStore((s) => s.apply);

  return (
    <div className="flex flex-col gap-3">
      <FieldRow label="Name">
        {(id) => (
          <Input
            id={id}
            value={shot.name}
            disabled={readOnly}
            onChange={(event) =>
              apply((draft) => {
                updateShot(draft, sceneId, shotId, { name: event.target.value });
              })
            }
          />
        )}
      </FieldRow>

      <FieldRow label="Type">
        {() => (
          <ChoiceChips
            value={shot.type}
            onValueChange={(value) =>
              apply((draft) => {
                updateShot(draft, sceneId, shotId, { type: value as ShotType });
              })
            }
          >
            {SHOT_TYPES.map((type) => (
              <ChoiceChip key={type} value={type}>
                {type}
              </ChoiceChip>
            ))}
          </ChoiceChips>
        )}
      </FieldRow>

      <FieldRow label="Duration" hint="Seconds">
        {(id) => (
          <UnitInput
            id={id}
            aria-label="Duration"
            unit="s"
            disabled={readOnly}
            value={shot.durationSec}
            min={0.5}
            step={0.5}
            onValueChange={(value) =>
              apply((draft) => {
                updateShot(draft, sceneId, shotId, { durationSec: value });
              })
            }
          />
        )}
      </FieldRow>

      <FieldRow label="Lens" hint="Millimetres">
        {(id) => (
          <div className="flex flex-1 items-center gap-2">
            <Slider
              id={id}
              min={12}
              max={200}
              step={1}
              disabled={readOnly}
              value={[shot.camera.lensMm]}
              onValueChange={([value]) =>
                apply((draft) => {
                  setShotLens(draft, sceneId, shotId, value);
                })
              }
              thumbLabels={["Lens in millimetres"]}
            />
            <UnitInput
              aria-label="Lens in millimetres"
              unit="mm"
              disabled={readOnly}
              value={shot.camera.lensMm}
              onValueChange={(value) =>
                apply((draft) => {
                  setShotLens(draft, sceneId, shotId, value);
                })
              }
            />
          </div>
        )}
      </FieldRow>
    </div>
  );
}
