import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useBlobObjectUrl } from "./useBlobObjectUrl";

vi.mock("@/storage/blob-store", () => ({
  getBlob: vi.fn(),
}));

function Harness({ blobKey }: { blobKey: string | undefined }) {
  const url = useBlobObjectUrl(blobKey);
  return <div data-testid="url">{url ?? "none"}</div>;
}

let objectUrlCounter = 0;
let revoked: string[] = [];

beforeEach(() => {
  objectUrlCounter = 0;
  revoked = [];
  URL.createObjectURL = vi.fn(() => `blob:mock-${objectUrlCounter++}`);
  URL.revokeObjectURL = vi.fn((url: string) => {
    revoked.push(url);
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useBlobObjectUrl", () => {
  it("resolves a blob key to an object URL", async () => {
    const { getBlob } = await import("@/storage/blob-store");
    vi.mocked(getBlob).mockResolvedValue(new Blob(["x"]));

    render(<Harness blobKey="thumb:1" />);

    expect(await screen.findByText("blob:mock-0")).toBeInTheDocument();
  });

  it("shows nothing for a missing blob key", () => {
    render(<Harness blobKey={undefined} />);
    expect(screen.getByTestId("url")).toHaveTextContent("none");
  });

  it("revokes the previous URL when the key changes, and the last one on unmount", async () => {
    const { getBlob } = await import("@/storage/blob-store");
    vi.mocked(getBlob).mockResolvedValue(new Blob(["x"]));

    const { rerender, unmount } = render(<Harness blobKey="thumb:1" />);
    await screen.findByText("blob:mock-0");

    rerender(<Harness blobKey="thumb:2" />);
    await screen.findByText("blob:mock-1");
    expect(revoked).toContain("blob:mock-0");

    unmount();
    expect(revoked).toContain("blob:mock-1");
  });

  it("falls back to no URL when the fetch rejects, instead of an unhandled rejection", async () => {
    const { getBlob } = await import("@/storage/blob-store");
    vi.mocked(getBlob).mockRejectedValue(new Error("IndexedDB unavailable"));

    render(<Harness blobKey="thumb:1" />);

    await waitFor(() => expect(screen.getByTestId("url")).toHaveTextContent("none"));
  });
});
