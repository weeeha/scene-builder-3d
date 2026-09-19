import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import App from "./App";

describe("App", () => {
  it("renders the placeholder text, a kit button, a kit kbd and the theme toggle", () => {
    render(<App />);

    expect(screen.getByText("scene-builder-3d")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Placeholder button" })
    ).toBeInTheDocument();
    expect(screen.getByText("D")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Toggle theme" })
    ).toBeInTheDocument();
  });
});
