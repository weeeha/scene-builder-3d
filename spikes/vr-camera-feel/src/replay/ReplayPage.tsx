import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { PerspectiveCamera } from "three";
import { STAGE_BACKGROUND } from "@/stage/render/clip-constants";
import type { TakeSummary } from "../../takes-plugin";
import { FORMAT_21_9, FULL_FRAME, vFovDeg } from "../camera/fov";
import { parseTake, poseAt, type Take } from "../camera/take";
import { CLIP_ASPECT, LENS_FAR_M, LENS_NEAR_M } from "../constants";
import { StageMount } from "../xr/StageMount";

type RigProps = { take: Take; playing: boolean; restartToken: number; onTime(tSec: number): void };

/** Drives the canvas's own camera through the take: this camera IS the lens, at the take's focal length. */
function LensRig({ take, playing, restartToken, onTime }: RigProps) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const clock = useRef(0);
  const sinceReport = useRef(1);

  useEffect(() => {
    clock.current = 0;
  }, [take, restartToken]);

  useEffect(() => {
    camera.fov = vFovDeg(take.lensMm, FULL_FRAME, FORMAT_21_9);
    camera.near = LENS_NEAR_M;
    camera.far = LENS_FAR_M;
    camera.updateProjectionMatrix();
  }, [camera, take]);

  useFrame((_state, delta) => {
    if (playing) clock.current = Math.min(take.durationSec, clock.current + delta);
    const pose = poseAt(take.move.samples, clock.current);
    camera.position.set(pose.position[0], pose.position[1], pose.position[2]);
    camera.quaternion.set(pose.rotation[0], pose.rotation[1], pose.rotation[2], pose.rotation[3]);
    sinceReport.current += delta;
    if (sinceReport.current >= 0.2) {
      sinceReport.current = 0;
      onTime(clock.current);
    }
  });

  return null;
}

const linkStyle = { color: "#88c0d0" } as const;
const buttonStyle = { marginRight: 8, padding: "4px 10px" } as const;

export function ReplayPage() {
  const [summaries, setSummaries] = useState<TakeSummary[]>([]);
  const [listNote, setListNote] = useState("loading takes...");
  const [take, setTake] = useState<Take | null>(null);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState(true);
  const [restartToken, setRestartToken] = useState(0);
  const [time, setTime] = useState(0);

  useEffect(() => {
    fetch("/takes")
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<TakeSummary[]>;
      })
      .then((list) => {
        setSummaries(list);
        setListNote(list.length === 0 ? "No takes yet. Record one on the main page." : "");
      })
      .catch(() => setListNote("No dev server here to list takes. Load a downloaded take file instead."));
  }, []);

  function show(json: string): void {
    try {
      setTake(parseTake(json));
      setError("");
      setPlaying(true);
      setTime(0);
      setRestartToken((n) => n + 1);
    } catch (e) {
      setTake(null);
      setError((e as Error).message);
    }
  }

  function loadFromServer(id: string): void {
    fetch(`/takes/${id}.json`)
      .then((response) => response.text())
      .then(show)
      .catch((e: Error) => setError(`Could not load ${id}: ${e.message}`));
  }

  function loadFromFile(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    if (file) void file.text().then(show);
  }

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 18 }}>THROWAWAY spike (exploration): take replay</h1>
      <p>
        <a href="#/" style={linkStyle}>Back to the camera page</a>
      </p>

      <div style={{ marginBottom: 12 }}>
        {summaries.map((s) => (
          <button key={s.id} style={buttonStyle} onClick={() => loadFromServer(s.id)}>
            Take {s.number}: {s.lensMm} mm, {s.durationSec.toFixed(1)} s
          </button>
        ))}
        <span>{listNote}</span>
      </div>

      <label style={{ display: "block", marginBottom: 12 }}>
        Load a take file: <input type="file" accept="application/json,.json" onChange={loadFromFile} />
      </label>

      {error && <p style={{ color: "#ff5555" }}>{error}</p>}

      {take && (
        <>
          <div style={{ width: "100%", aspectRatio: String(CLIP_ASPECT), background: "#000" }}>
            <Canvas flat>
              <color attach="background" args={[STAGE_BACKGROUND]} />
              <StageMount />
              <LensRig take={take} playing={playing} restartToken={restartToken} onTime={setTime} />
            </Canvas>
          </div>
          <p>
            <button style={buttonStyle} onClick={() => setPlaying((p) => !p)}>
              {playing ? "Pause" : "Play"}
            </button>
            <button
              style={buttonStyle}
              onClick={() => {
                setRestartToken((n) => n + 1);
                setPlaying(true);
              }}
            >
              Restart
            </button>
            Take {take.number} | {take.lensMm} mm | smoothing {take.rig.smoothing} | {time.toFixed(1)} / {take.durationSec.toFixed(1)} s
          </p>
        </>
      )}
    </div>
  );
}
