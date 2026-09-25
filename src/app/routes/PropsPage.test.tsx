import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PropsPage } from "./PropsPage";

describe("PropsPage", () => {
  it("shows the S2 empty state", () => {
    render(<PropsPage />);
    expect(screen.getByText("Props arrive in S2")).toBeInTheDocument();
  });
});
