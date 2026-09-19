# THROWAWAY: VR camera feel spike

> **Status:** exploration. Throwaway code. This branch is never merged.
> Spec: `docs/superpowers/specs/2026-09-18-vr-operator-design.md`, section 4.

A WebXR page that answers five questions about holding a virtual film camera in a Quest:
frame rate, steadiness, viewfinder legibility, takes stored as poses, and the dev loop.

## Provenance

`src/stage/` is copied as-is from `weeeha/Film-Planner-` at commit `58987e2`
(`film-planner/src/stage/`). Do not edit those files here.

## Run

    pnpm install
    pnpm test
    pnpm dev:http     # http://localhost:5173 on this Mac
    pnpm dev          # https on the LAN, for the headset
