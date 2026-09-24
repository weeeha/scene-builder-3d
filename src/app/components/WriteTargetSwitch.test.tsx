import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { useEditorStore } from "@/state/editor-store";
import { WriteTargetSwitch } from "./WriteTargetSwitch";

describe("WriteTargetSwitch", () => {
  it("defaults to this shot and switches to set", async () => {
    const user = userEvent.setup();
    useEditorStore.setState({ writeTarget: "shot" });
    render(<WriteTargetSwitch />);

    expect(screen.getByRole("radio", { name: "This shot" })).toHaveAttribute(
      "aria-checked",
      "true"
    );

    await user.click(screen.getByRole("radio", { name: "Set" }));
    expect(useEditorStore.getState().writeTarget).toBe("set");
  });
});
