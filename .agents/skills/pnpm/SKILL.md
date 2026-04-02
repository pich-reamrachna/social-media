---
name: pnpm
description: Best practices for using `pnpm` in this project. Use when installing/removing packages, managing workspace dependencies, or troubleshooting `node_modules`. Helps avoid dependency drift and ensures consistent builds.
---

# pnpm Best Practices

`pnpm` is a fast, disk-efficient package manager used in this project. It uses a content-addressable storage (CAS) to save disk space and avoids the `node_modules` spaghetti of `npm`.

## Basic Commands

### Installing Dependencies

- **Add a Package:** `pnpm add package-name`
- **Add Dev Dependency:** `pnpm add -D package-name`
- **Install All:** `pnpm install` (or simply `pnpm i`)

### Removing Packages

- **Remove:** `pnpm remove package-name` (or `pnpm rm`)

### Running Scripts

- **Execute Script:** `pnpm <script-name>` (e.g., `pnpm dev`, `pnpm build`, `pnpm test`)
- **Direct Execute:** `pnpm exec <binary>` (replaces `npx`)

## Filter & Workspace

If this project has many packages (workspace), use `--filter`:

- `pnpm --filter ./apps/web dev`

## Working with the Lockfile

- **Lockfile:** `pnpm-lock.yaml` is the source of truth for dependencies.
- **Update Lockfile:** If the lockfile is out of sync, run `pnpm install`.
- **Merge Conflicts:** If you have a merge conflict in `pnpm-lock.yaml`, usually running `pnpm install` will resolve it by regenerating the lockfile.

## Node.js Version

The required Node.js version is often defined in `.nvmrc` or `.node-version`. `pnpm` will respect these if configured.

## Troubleshooting

- **Missing Dependencies:** If you get `Package not found` but it's in `package.json`, try `pnpm install`.
- **Cache Clean:** `pnpm store prune` cleans up unused packages from the global store.
- **Forced Reinstall:** `pnpm install --force`.
