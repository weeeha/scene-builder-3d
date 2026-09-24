import { runtime } from "../runtime";
import { useSpikeStore } from "../store";

/** Which speech-recognition constructors the browser exposes. `win` is `window` in the app and a fake in tests. */
export function detectSpeechApis(win: object): { speechRecognition: boolean; webkitSpeechRecognition: boolean } {
  return {
    speechRecognition: "SpeechRecognition" in win,
    webkitSpeechRecognition: "webkitSpeechRecognition" in win,
  };
}

/** Asks for the microphone once and records what happened, tagged with where it was asked from. */
export async function runMicProbe(): Promise<void> {
  const { setProbe } = useSpikeStore.getState();
  const where = runtime.inXR ? "in VR" : "flat";
  if (!navigator.mediaDevices?.getUserMedia) {
    setProbe({ mic: `unavailable (${where})` });
    return;
  }
  setProbe({ mic: `asking (${where})` });
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop()); // the probe only wants the answer
    setProbe({ mic: `granted (${where})` });
  } catch (error) {
    setProbe({ mic: `denied: ${(error as Error).name} (${where})` });
  }
}
