import { useEffect, useState } from "react";

import { getBlob } from "@/storage/blob-store";

/**
 * Resolves a blob-store key to a revocable object URL. Extracted from the
 * identical logic ShotThumbnailImage and BoardShotThumbnail used to
 * duplicate: reset to null during render when the key changes (so nothing
 * shows a stale image while the new key's fetch is in flight, the same
 * set-state-in-effect-avoiding pattern ProjectLayout uses elsewhere),
 * fetch in an effect, revoke the previous URL on change or unmount. A
 * rejected fetch (an IndexedDB failure) is caught and leaves url at null,
 * the same "no thumbnail" state a missing key already produces, instead
 * of surfacing as an unhandled rejection.
 */
export function useBlobObjectUrl(blobKey: string | undefined): string | null {
  const [prevBlobKey, setPrevBlobKey] = useState(blobKey);
  const [url, setUrl] = useState<string | null>(null);

  if (blobKey !== prevBlobKey) {
    setPrevBlobKey(blobKey);
    setUrl(null);
  }

  useEffect(() => {
    if (!blobKey) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    getBlob(blobKey)
      .then((blob) => {
        if (cancelled || !blob) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        // Leave url at null: the caller renders its own placeholder for
        // "no thumbnail yet", the same state a missing blob key produces.
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [blobKey]);

  return url;
}
