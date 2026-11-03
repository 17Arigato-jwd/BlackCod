# Fedora COPR SCM packaging

The Fedora package is intentionally built from the Git checkout rather than
shipping an Electron Forge binary. COPR can use
`packaging/fedora/blackcod.spec` as the spec file for an SCM project.

The spec builds the renderer and main process from source, installs the
application under `/usr/libexec/blackcod`, and launches it through Fedora's
system Electron package. This keeps the RPM architecture-native and avoids
duplicating a private Electron runtime inside the package.

For a COPR SCM project:

1. Select the BlackCod Git repository and the branch to build.
2. Set the spec file to `packaging/fedora/blackcod.spec`.
3. Use the repository checkout as the SCM source; do not provide a release
   tarball URL.
4. Build the package for the Fedora releases supported by the installed
   `electron` package.

The package requires the repository's `package-lock.json` and runs
`npm ci --ignore-scripts --include=dev` during `%build`. The spec uses the
GitHub `main` archive as `Source0`; this is required because COPR's `rpkg`
source-build step does not synthesize a `blackcod-%{version}.tar.gz` archive
from the SCM checkout. Development dependencies are pruned after the build so
the RPM does not ship build-only native tools such as esbuild.
Automatic debug packages are disabled because the application is distributed
as JavaScript and Electron assets rather than native debuggable binaries.
