import { describe, expect, it } from "vitest";
import { detectSpeechApis } from "./probe";

describe("detectSpeechApis", () => {
  it("reports both APIs missing on a bare object", () => {
    expect(detectSpeechApis({})).toEqual({ speechRecognition: false, webkitSpeechRecognition: false });
  });

  it("detects the standard name", () => {
    expect(detectSpeechApis({ SpeechRecognition: class {} })).toEqual({ speechRecognition: true, webkitSpeechRecognition: false });
  });

  it("detects the webkit-prefixed name", () => {
    expect(detectSpeechApis({ webkitSpeechRecognition: class {} })).toEqual({ speechRecognition: false, webkitSpeechRecognition: true });
  });
});
