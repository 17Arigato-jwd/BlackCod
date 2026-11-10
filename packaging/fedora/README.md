# Fedora COPR SCM packaging

The Fedora package is built directly from the Git checkout rather than
shipping an Electron Forge bundle. COPR uses `packaging/fedora/blackcod.spec` as
the spec file for an SCM project.

## Dual-Package Architecture

BlackCod on Fedora is split into two packages hosted within the same Copr repository:

1. **`blackcod`** (`packaging/fedora/blackcod.spec`):
   - Builds renderer and main process from source (`npm run build`, `npm run build:main`).
   - Installs application code and runtime dependencies under `/usr/libexec/blackcod/`.
   - Installs launcher `/usr/bin/blackcod`, desktop entry, and application icon.
   - Declares `Requires: blackcod-electron`.

2. **`blackcod-electron`** (`packaging/fedora/blackcod-electron.spec`):
   - Packages the pinned, architecture-native Electron runtime (v39.2.7) under `/usr/libexec/blackcod-electron/`.
   - Downloaded from official Electron releases with SHA-256 integrity verification.

The launcher script `/usr/bin/blackcod` executes:
```sh
exec /usr/libexec/blackcod-electron/electron /usr/libexec/blackcod "$@"
```

Because both packages reside in the `17arigato-jwd/blackcod` Copr repository,
users do not need external third-party repositories:
`sudo dnf install blackcod` automatically resolves and installs
`blackcod-electron` as a runtime dependency.

## Installation for End Users

```bash
sudo dnf copr enable 17arigato-jwd/blackcod
sudo dnf install blackcod
```

If `dnf copr` is not available, install the COPR command plugin first:

```bash
sudo dnf install 'dnf-command(copr)'
```

## COPR Maintainer Configuration

For a COPR SCM project:

1. Select the BlackCod Git repository and the branch to build (`main`).
2. Set the spec file to `packaging/fedora/blackcod.spec`.
3. Use the repository checkout as the SCM source; do not provide a release tarball URL.
4. Ensure the `blackcod-electron` package is built in the same Copr repository so dependency resolution succeeds.

The package requires the repository's `package-lock.json` and runs
`npm ci --ignore-scripts --include=dev` during `%build`. The spec uses the
GitHub `main` archive as `Source0`; this is required because COPR's `rpkg`
source-build step does not synthesize a `blackcod-%{version}.tar.gz` archive
from the SCM checkout. Development dependencies are pruned after the build so
the RPM does not ship build-only native tools such as esbuild.
Automatic debug packages are disabled because the application is distributed
as JavaScript and Electron assets rather than native debuggable binaries.
