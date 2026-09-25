import { create } from "zustand";

export type PlaybackState = {
  time: number;
  playing: boolean;
  setTime(t: number): void;
  setPlaying(p: boolean): void;
};

export const usePlaybackStore = create<PlaybackState>()((set) => ({
  time: 0,
  playing: false,
  setTime(t) {
    set({ time: t });
  },
  setPlaying(p) {
    set({ playing: p });
  },
}));
