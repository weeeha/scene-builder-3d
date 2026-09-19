import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import App from "./App";

describe("App", () => {
  it("renders the placeholder text", () => {
    render(<App />);

    expect(screen.getByText("scene-builder-3d")).toBeInTheDocument();
  });
});
