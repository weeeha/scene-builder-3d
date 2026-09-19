/**
 * Requests a Web Lock scoped to one project id. The first caller in any
 * tab gets readOnly: false and holds the lock until release() is called.
 * A second concurrent caller for the same project id gets readOnly: true,
 * since ifAvailable makes the browser hand back null immediately instead
 * of queuing. Without Web Locks support at all, every caller gets
 * readOnly: false: there is no way to detect a second tab.
 */
export function acquireProjectLock(
  projectId: string,
): Promise<{ readOnly: boolean; release: () => void }> {
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  if (!locks) {
    return Promise.resolve({ readOnly: false, release: () => {} });
  }

  return new Promise((resolve) => {
    let release: () => void = () => {};
    const held = new Promise<void>((resolveHeld) => {
      release = resolveHeld;
    });

    void locks.request(`sb3d-project:${projectId}`, { ifAvailable: true }, (lock) => {
      if (lock === null) {
        resolve({ readOnly: true, release: () => {} });
        return Promise.resolve();
      }
      resolve({ readOnly: false, release });
      return held;
    });
  });
}
