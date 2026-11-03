# Fedora / RPM Packaging Specification Analysis: Top-Level-Less Zip Archives & Electron Runtime Packaging

**Author**: Spec Miner 1  
**Date**: 2026-11-03  
**Target Specification**: `packaging/fedora/blackcod-electron.spec`  
**Reference Specification**: `packaging/fedora/blackcod.spec`, Fedora Packaging Guidelines, RPM 4.18+ / 6.0 standards  

---

## Executive Summary

The `%install` failure in `packaging/fedora/blackcod-electron.spec`:
```
cp: cannot stat 'electron-v39.2.7-linux-x64/.': No such file or directory
```
is caused by an incorrect assumption regarding the internal structure of official Electron release zip archives. Official Electron release archives (`electron-v*.zip`) are flat archives ("zip-bombs") containing no top-level enclosing directory.

In `%prep`, `%setup -q -c -T` creates and changes into the RPM build subdirectory `%{_builddir}/blackcod-electron-39.2.7/`. The subsequent invocation `unzip -q %{SOURCE0}` unpacks all 74 Electron runtime files and subdirectories (`electron`, `locales/`, `resources/`, `LICENSE`, etc.) directly into the current working directory (`.`). When `%install` executes, RPM automatically switches into `%{_builddir}/blackcod-electron-39.2.7/`. Attempting to copy from `electron-v%{version}-linux-x64/.` fails because no subdirectory by that name exists.

Additionally, our specification mining revealed two related critical packaging issues in `packaging/fedora/blackcod-electron.spec`:
1. **Prebuilt ELF Debuginfo Failure**: Missing `%global debug_package %{nil}`. Because upstream Electron binaries are pre-stripped and lack external `.dwo` files, RPM's automatic `find-debuginfo` post-install script crashes with GDB exit status 1 during `.gdb_index` generation.
2. **Duplicate `%license` Warning**: In `%files`, specifying both `%license %{_libexecdir}/blackcod-electron/LICENSE` and `%{_libexecdir}/blackcod-electron/` causes RPM to emit duplicate file ownership warnings. Using `%license LICENSE LICENSES.chromium.html` conforms to Fedora standards and installs licenses under `%{_defaultlicensedir}/%{name}/`.

---

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Archive Layout | Electron Release Zip Structure | Official Electron GitHub release zip archives (`electron-v*.zip`) are flat archives without an enclosing root folder. | `electron-v39.2.7-linux-x64.zip` | 74 items (`electron`, `chrome-sandbox`, `locales/`, `resources/`, `libffmpeg.so`, etc.) at archive root | Extraction without directory creation pollutes parent directory | `unzip -l` on upstream archive |
| 2 | RPM %prep Macro | `%setup -c` | Creates the build directory `%{_builddir}/%{name}-%{version}` and `cd`s into it before uncompressing the archive. | Flag `-c` passed to `%setup` | Directory created, `pwd` is `.../%{name}-%{version}` | If directory cannot be created, `%prep` aborts | RPM specification & `rpmbuild -bp` |
| 3 | RPM %prep Macro | `%setup -T` | Suppresses default automatic unpacking of `Source0`. | Flag `-T` passed to `%setup` | `Source0` not uncompressed automatically; allows custom uncompress or checksum | N/A | RPM specification & `rpmbuild -bp` |
| 4 | RPM %prep Macro | `%setup -n <dir>` | Overrides the canonical build subdirectory name from `%{name}-%{version}` to `<dir>`. | `-n <custom-dir>` | Working directory becomes `<custom-dir>` across all stages (`%prep`, `%build`, `%install`) | If custom dir does not exist and `-c` is absent, `cd` fails | RPM specification & `rpmbuild -bp` |
| 5 | Modern Macro | `%autosetup -c` | Fedora standard macro that creates `%{name}-%{version}` and unpacks `Source0` via `rpmuncompress -x`. | Flag `-c` passed to `%autosetup` | Directory created and archive unpacked automatically | Unpacks immediately; cannot perform pre-unpack checksum verification | Fedora Packaging Guidelines |
| 6 | Multi-Source | `%setup -T -D -a N` | Handles secondary sources in multi-source packages by unpacking `SourceN` into current builddir without re-extracting `Source0` or cleaning builddir. | `-T -D -a 1` | `Source1` unpacked inside current build subdirectory | Overwrites or fails if directory cleaned | Fedora Packaging Guidelines |
| 7 | Lifecycle Stage | `%install` Working Directory | RPM automatically inserts `cd %{_builddir}/%{buildsubdir}` at the start of `%install`. | Stage execution in RPM | Current working directory is `%{name}-%{version}` (or `-n <dir>`) | If directory missing, `%install` aborts | RPM build script inspection |
| 8 | Buildroot Copying | Flat Directory Copying | Copying flat runtime files from current build subdirectory to `%{buildroot}%{_libexecdir}/%{name}`. | `cp -a . %{buildroot}%{_libexecdir}/blackcod-electron/` | All extracted files copied to destination | `cp: cannot stat` if referencing non-existent subdirectories | `rpmbuild -bi` testing |
| 9 | Prebuilt Packaging | `%global debug_package %{nil}` | Disables automatic debuginfo extraction and debug source package generation for pre-compiled binaries. | Macro definition in spec preamble | `find-debuginfo` is skipped during `%install` post-processing | Without this, `gdb` crashes generating `.gdb_index` on pre-stripped binaries | `rpmbuild -ba` empirical reproduction |
| 10 | RPM %files Macro | Fedora `%license` Handling | `%license` macro taking relative file paths copies licenses into `%{_defaultlicensedir}/%{name}/`. | `%license LICENSE LICENSES.chromium.html` | Clean license tracking without duplicate ownership warnings | Absolute paths inside already-owned directories emit "File listed twice" | RPM 6.0 build warnings inspection |

---

## Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Archive Extraction | Extracting `electron-v*.zip` without `-c` | 74 loose files splatter across `%{_builddir}` directly, polluting the build root ("zip-bomb"). |
| 2 | `%prep` Directory State | `%setup -q -c -T` followed by `unzip -q %{SOURCE0}` | Working directory is `%{_builddir}/blackcod-electron-39.2.7/`. Uncompressed files reside in `.`, with no `electron-v%{version}-linux-x64/` subdirectory. |
| 3 | Path Reference in `%install` | `cp -a electron-v%{version}-linux-x64/. %{buildroot}...` | Shell error: `cp: cannot stat 'electron-v39.2.7-linux-x64/.': No such file or directory`. Build aborts. |
| 4 | Working Directory in `%install` | `cp -a . %{buildroot}%{_libexecdir}/blackcod-electron/` | All 74 runtime files (executables, shared libraries, locales, resources, assets) successfully copied to buildroot. |
| 5 | Prebuilt Binaries without debuginfo disabled | Missing `%global debug_package %{nil}` | Post-install `find-debuginfo` fails: `*** ERROR:: GDB exited with exit status 1 during index generation (can't add section '.gdb_index')`. |
| 6 | License Specification in `%files` | `%license %{_libexecdir}/blackcod-electron/LICENSE` together with `%{_libexecdir}/blackcod-electron/` | RPM emits `warning: File listed twice: /usr/libexec/blackcod-electron/LICENSE`. |
| 7 | Standard License Specification in `%files` | `%license LICENSE LICENSES.chromium.html` together with `%{_libexecdir}/blackcod-electron/` | Clean build with zero warnings. Licenses copied to `/usr/share/licenses/blackcod-electron/`. |

---

## Detailed Investigation

### 1. Structure of Official Electron Release Zips

Inspection of `electron-v39.2.7-linux-x64.zip` (sha256: `2f5285ef563dca154aa247696dddef545d3d895dd9b227ed423ea0d43737c22c`):
- Contains 74 entries.
- Contains ELF binaries (`electron`, `chrome-sandbox`, `chrome_crashpad_handler`).
- Contains shared libraries (`libEGL.so`, `libGLESv2.so`, `libffmpeg.so`, `libvk_swiftshader.so`, `libvulkan.so.1`).
- Contains data/pak files (`icudtl.dat`, `resources.pak`, `chrome_100_percent.pak`, `chrome_200_percent.pak`, `v8_context_snapshot.bin`, `snapshot_blob.bin`).
- Contains subfolders: `locales/` (56 `.pak` files), `resources/` (`default_app.asar`).
- Contains license and config files: `LICENSE`, `LICENSES.chromium.html`, `version`, `vk_swiftshader_icd.json`.
- **Crucial layout property**: Every file entry is rooted at the top level of the archive (e.g. `electron`, NOT `electron-v39.2.7-linux-x64/electron`).

### 2. Interaction of `%setup -c`, `%setup -T`, and Working Directories

The RPM build process generates shell scripts for each section:
1. `%prep`:
   - With `%setup -q -c -T`, RPM generates:
     ```sh
     cd /path/to/BUILD/blackcod-electron-39.2.7-build
     rm -rf blackcod-electron-39.2.7
     mkdir -p blackcod-electron-39.2.7
     cd blackcod-electron-39.2.7
     chmod -Rf a+rX,u+w,g-w,o-w .
     ```
   - `-c` creates the subdirectory `blackcod-electron-39.2.7` and `cd`s into it.
   - `-T` skips the automatic unpack step.
   - The user script commands run next:
     ```sh
     echo "2f5285ef563dca154aa247696dddef545d3d895dd9b227ed423ea0d43737c22c  %{SOURCE0}" | sha256sum -c -
     unzip -q %{SOURCE0}
     ```
   - Because `pwd` is already `.../blackcod-electron-39.2.7/`, `unzip` extracts the files directly into this directory.
2. `%build`:
   - RPM automatically generates `cd blackcod-electron-39.2.7`.
3. `%install`:
   - RPM automatically generates `cd blackcod-electron-39.2.7`.
   - The files are located in `.` (the current directory).
   - Any reference to `electron-v%{version}-linux-x64/` fails because no such directory exists.

### 3. Comparison of Architectural Solutions

| Solution | %prep | %install | Fedora Compliance | Assessment |
|----------|-------|----------|-------------------|------------|
| **Solution 1: Standard Root Copy (Recommended)** | Keep `%setup -q -c -T`, sha256 check, and `unzip -q %{SOURCE0}` | `cp -a . %{buildroot}%{_libexecdir}/blackcod-electron/` | Highest. Matches canonical `%setup -c` pattern where builddir IS the uncompressed package root. | **BEST**: Clean, standard, eliminates bogus path reference. |
| **Solution 2: Subfolder Unpack (`unzip -d`)** | `unzip -q %{SOURCE0} -d electron-v%{version}-linux-x64` | Keep `cp -a electron-v%{version}-linux-x64/. %{buildroot}...` | Low/Suboptimal. Introduces artificial nested folder inside builddir. | Anti-pattern in Fedora specs; extra unnecessary nesting level. |
| **Solution 3: `%autosetup -c`** | `%autosetup -c` | `cp -a . %{buildroot}%{_libexecdir}/blackcod-electron/` | High, but removes the explicit sha256 checksum check on `%{SOURCE0}`. | Modern macro, but loses pre-extraction sha256 tamper verification. |

### 4. Supporting Adjustments Required for Fedora Standards

1. **`%global debug_package %{nil}`**:
   Upstream pre-compiled binary packages must disable debuginfo generation to avoid build failures caused by `find-debuginfo` trying to parse missing `.dwo` files in pre-stripped binaries. This is identical to `packaging/fedora/blackcod.spec` line 8.
2. **`%license` macro usage**:
   Change `%license %{_libexecdir}/blackcod-electron/LICENSE` to `%license LICENSE LICENSES.chromium.html`. This follows the Fedora Packaging Guidelines for license installation and avoids RPM warnings regarding duplicate file ownership.

---

## Concrete Implementation Recommendation

The Worker should apply the following diff to `packaging/fedora/blackcod-electron.spec`:

```diff
--- a/packaging/fedora/blackcod-electron.spec
+++ b/packaging/fedora/blackcod-electron.spec
@@ -1,3 +1,5 @@
+%global debug_package %{nil}
+
 Name:           blackcod-electron
 Version:        39.2.7
 Release:        1%{?dist}
@@ -21,11 +23,10 @@ repository.
 %build
 
 %install
 install -d %{buildroot}%{_libexecdir}/blackcod-electron
-cp -a electron-v%{version}-linux-x64/. \
+cp -a . \
   %{buildroot}%{_libexecdir}/blackcod-electron/
 
 %files
-%license %{_libexecdir}/blackcod-electron/LICENSE
-%license %{_libexecdir}/blackcod-electron/LICENSES.chromium.html
+%license LICENSE LICENSES.chromium.html
 %{_libexecdir}/blackcod-electron/
```

### Verification Evidence
- `rpmbuild -bp`: Evaluates `%prep` cleanly; sha256 check passes and unzip unpacks to `.`.
- `rpmbuild -bc`: Evaluates `%build` cleanly.
- `rpmbuild -bi`: Installs all 74 items into buildroot cleanly without path errors or `find-debuginfo` crashes.
- `rpmbuild -ba`: Generates valid binary RPM (`blackcod-electron-39.2.7-1.fc44.x86_64.rpm`) and Source RPM (`blackcod-electron-39.2.7-1.fc44.src.rpm`) with zero warnings and zero errors.
