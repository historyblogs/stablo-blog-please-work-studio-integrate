# Astro Hot Reload Blues

## The Problem

When multiple Astro dev servers run simultaneously in adjacent project directories on macOS, they can freeze and stop responding to file changes — requiring a manual kill command to recover.

**Root cause:** macOS uses FSEvents to watch the filesystem. Each running Vite/Astro dev server opens file-watch handles for its entire project tree. When several servers run at once, they collectively exhaust the kernel's file descriptor limit for FSEvents. The server process stays alive but the watcher silently dies, so HMR stops working and the server appears frozen.

---

## The Fix

Two changes to `astro.config.ts` address this:

### 1. Tighten the Vite file watcher

Add an `ignored` list inside `vite.server.watch` to exclude directories that don't need to trigger hot reload. This dramatically reduces the number of FSEvents handles each server holds open.

```typescript
// astro.config.ts
export default defineConfig({
  // ... other config

  vite: {
    // ... other vite config
    server: {
      watch: {
        ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**', '**/public/**'],
      },
    },
  },
});
```

> **Why `public/`?** Static assets in `public/` are served as-is and don't participate in HMR. Watching them wastes handles with no benefit.

### 2. Pin a dedicated port per project

Astro defaults to port 4321 and will hunt for the next free port if it's taken. This can cause confusion across projects. Give each site its own fixed port at the top level of `defineConfig`:

```typescript
export default defineConfig({
  server: {
    port: 4321, // ← change this number per project (4321, 4322, 4323, …)
  },

  vite: {
    /* ... */
  },
});
```

---

## Why Each Project Needs Its Own Port

If two projects both try to start on 4321, Astro silently bumps the second one to 4322. That's fine until you have a third, fourth, or fifth project — at which point port collisions cause delayed startup and can interfere with HMR WebSocket connections. Assigning ports explicitly (`4321`, `4322`, `4323`, …) removes the ambiguity.

---

## Optional: macOS Kernel Tuning

If you still hit issues with many projects open, you can raise the macOS file-descriptor ceiling for the current session:

```bash
sudo sysctl -w kern.maxfiles=65536
sudo sysctl -w kern.maxfilesperproc=65536
```

This resets on reboot. Add to `/etc/sysctl.conf` to make it permanent (create the file if it doesn't exist):

```
kern.maxfiles=65536
kern.maxfilesperproc=65536
```

---

## Summary Checklist

- [ ] Add `vite.server.watch.ignored` to each project's `astro.config.ts`
- [ ] Assign a unique `server.port` to each project
- [ ] (Optional) Raise macOS file-descriptor limits if running 4+ servers simultaneously
