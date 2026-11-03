# Empirical Stress Testing Report: Electron Archive Extraction & Installation

**Author**: Challenger 1 (Empirical Challenger: Critic, Specialist)  
**Date**: 2026-11-03  
**Target Spec**: `packaging/fedora/blackcod-electron.spec`  
**Target Archive**: `electron-v39.2.7-linux-x64.zip` (SHA256: `2f5285ef563dca154aa247696dddef545d3d895dd9b227ed423ea0d43737c22c`)  

---

## Challenge Summary

**Overall risk assessment**: **LOW**

Worker 1's packaging changes in `packaging/fedora/blackcod-electron.spec` accurately address the flat archive structure of official Electron release zips. Comprehensive empirical testing across extraction (`%prep`), staging (`%install`), binary stripping, and RPM package generation (`%files`) confirmed that:
- 100% of the 74 files inside `electron-v39.2.7-linux-x64.zip` are successfully extracted and installed under `%{buildroot}%{_libexecdir}/blackcod-electron/`.
- 0 files are missing, misplaced, or corrupted.
- Exactly 66 assets/data files remain bitwise identical to the zip archive payload.
- Exactly 8 ELF executables and shared libraries are cleanly processed by RPM's standard `brp-strip` policy into fully functional binaries that execute and pass runtime version checks (`Electron 39.2.7`, `Node 22.21.1`, `Chrome 142.0.7444.235`).
- All directories and executable files possess `0755` permissions, while all data assets possess `0644` permissions.
- Edge cases including dotfile handling, nested directory traversal, `default_app.asar` internal virtual filesystem integrity, and shared library soname resolution (`$ORIGIN`) all passed empirical verification.

---

## Challenges

### [Low] Challenge 1: Concurrent `rpmbuild` Invocations on Shared Default `_topdir`

- **Assumption challenged**: That executing `rpmbuild` using default directory paths (`~/rpmbuild`) is safe during multi-agent or parallel CI execution.
- **Attack scenario**: Running multiple simultaneous `rpmbuild` commands without an isolated `_topdir` causes build directory collision in `/home/varchas/rpmbuild/BUILD/blackcod-electron-39.2.7-build`, triggering `rm: cannot remove ... Directory not empty` in `%mkbuilddir`.
- **Blast radius**: Parallel build jobs colliding on disk fail prematurely during directory initialization.
- **Mitigation**: Verified that invoking `rpmbuild --define "_topdir <isolated_path>"` provides complete isolation and eliminates concurrency contention. Documented in build instructions.

### [Low] Challenge 2: Post-Install Stripping of Precompiled Upstream ELF Binaries

- **Assumption challenged**: That RPM's automated post-install policy (`brp-strip`, `brp-strip-comment-note`, `brp-strip-lto`) does not corrupt pre-stripped Chromium/Electron binaries or alter necessary ELF sections.
- **Attack scenario**: `strip` could truncate or corrupt proprietary sections, break RPATH/RUNPATH references, or invalidate checksums required by Chromium's internal sandboxing mechanisms (`chrome-sandbox`, `libffmpeg.so`).
- **Blast radius**: Executable binaries crash with `SIGSEGV` or dynamic linker failures at runtime.
- **Mitigation & Verification**: Extracted and executed the stripped binaries from the final binary RPM via `rpm2cpio`. Ran `ldd`, executed `electron` runtime commands (`process.versions`), tested `chrome-sandbox` argument parsing, and invoked `chrome_crashpad_handler --help`. All binaries executed cleanly and resolved `$ORIGIN/libffmpeg.so` without error.

---

## Stress Test Results

| # | Stress Test Scenario | Expected Behavior | Actual Behavior | Result |
|---|----------------------|-------------------|-----------------|--------|
| 1 | **Zip Archive Member Enumeration** | Exactly 74 entries, flat root layout, no top-level enclosing folder | 74 total entries (18 root files, 55 `locales/*.pak`, 1 `resources/default_app.asar`). 0 root directory entries, 0 dotfiles, 0 symlinks. | **PASS** |
| 2 | **Prep Stage Checksum & Extraction (`rpmbuild -bp`)** | SHA256 matches pinned hash; unzips into `blackcod-electron-39.2.7` | Checksum OK (`2f5285...`); unzips cleanly into working directory `.`. | **PASS** |
| 3 | **Builddir Integrity Audit** | All 74 files present in `%{_builddir}/blackcod-electron-39.2.7` with matching CRC32/SHA256 | 74/74 files present. 0 missing. 0 content mismatches against zip. | **PASS** |
| 4 | **Install Stage File Capture (`cp -a .`)** | Copies all 74 items into `%{buildroot}%{_libexecdir}/blackcod-electron/` without creating self-referential nested folders | 74/74 files installed into `/usr/libexec/blackcod-electron/`. No extra files or recursive directories created. | **PASS** |
| 5 | **Subdirectory Structure Verification** | `locales/` contains 55 `.pak` files; `resources/` contains `default_app.asar` | `locales/` contains 55 non-empty `.pak` files; `resources/default_app.asar` intact. | **PASS** |
| 6 | **Permission & Mode Conformance** | Executables (`electron`, `chrome-sandbox`, `chrome_crashpad_handler`, `*.so*`) are `0755`; assets/data files are `0644`; directories are `0755` | 8 files with mode `0755`; 66 files with mode `0644`; 3 directories with mode `0755`. 0 permission anomalies. | **PASS** |
| 7 | **Binary Stripping & Execution Test** | 8 stripped binaries remain valid ELF executables and run without crashing | Executed unpacked `electron`, `chrome-sandbox`, `chrome_crashpad_handler`. All executed successfully. | **PASS** |
| 8 | **Electron Runtime Introspection** | Unpacked `electron` runs JavaScript and reports correct versions | `ELECTRON_RUN_AS_NODE=1` printed `Electron: 39.2.7, Node: 22.21.1, Chrome: 142.0.7444.235`. | **PASS** |
| 9 | **ASAR Virtual Filesystem Integrity** | Electron's native asar driver reads contents of `resources/default_app.asar` | Read virtual directory: `['default_app.js', 'icon.png', 'index.html', 'main.js', 'octicon', 'package.json', 'preload.js', 'styles.css']`. | **PASS** |
| 10 | **Dynamic Linker Resolution (`ldd`)** | All shared library dependencies resolve, including `$ORIGIN/libffmpeg.so` | All dependencies resolved to system glibc/GTK3/NSS and `$ORIGIN/libffmpeg.so`. | **PASS** |
| 11 | **License Tag Packaging** | `%license` installs `LICENSE` and `LICENSES.chromium.html` under `%{_defaultlicensedir}` without file ownership collision | Installed under `/usr/share/licenses/blackcod-electron/` with mode `0644`. Distinct paths; no collision warnings. | **PASS** |
| 12 | **Edge Case: Dotfile Handling in `cp -a .`** | `cp -a .` copies hidden dotfiles (`.hidden`) if present without recursion | Isolated sandbox test confirmed `.hidden_file` and `.hidden_dir` copy cleanly with permissions preserved. | **PASS** |
| 13 | **Full Binary RPM Build (`rpmbuild -ba`)** | Generates valid SRPMS and RPMS | Generated `blackcod-electron-39.2.7-1.fc44.src.rpm` and `blackcod-electron-39.2.7-1.fc44.x86_64.rpm` (exit code 0). | **PASS** |

---

## Detailed Empirical Findings

### 1. Archive Layout vs Buildroot Mapping

Upstream `electron-v39.2.7-linux-x64.zip` structure:
```text
Root files (18):
  chrome-sandbox (15,328 bytes)
  chrome_100_percent.pak (115,176 bytes)
  chrome_200_percent.pak (188,186 bytes)
  chrome_crashpad_handler (1,545,800 bytes)
  electron (199,855,320 bytes)
  icudtl.dat (10,467,680 bytes)
  libEGL.so (251,224 bytes)
  libGLESv2.so (6,344,096 bytes)
  libffmpeg.so (2,681,808 bytes)
  libvk_swiftshader.so (4,702,912 bytes)
  libvulkan.so.1 (2,378,920 bytes)
  LICENSE (1,096 bytes)
  LICENSES.chromium.html (15,102,119 bytes)
  resources.pak (6,490,209 bytes)
  snapshot_blob.bin (403,834 bytes)
  v8_context_snapshot.bin (776,865 bytes)
  version (6 bytes)
  vk_swiftshader_icd.json (107 bytes)

Subdirectories:
  locales/ (55 .pak files)
  resources/default_app.asar (109,371 bytes)

Total: 74 files
```

RPM payload query (`rpm -qpl`) verified all 74 files under `/usr/libexec/blackcod-electron/` plus the 2 license files under `/usr/share/licenses/blackcod-electron/`.

### 2. File Modes in RPM Header (`rpm -qp --dump`)

- Executables: `0100755 root root`
- Shared libraries: `0100755 root root`
- Subdirectories: `040755 root root`
- Pak, dat, bin, json, asar, licenses: `0100644 root root`

### 3. Verification of `cp -a .` vs `cp -a *`

Because official Electron zip archives are flat, `%setup -q -c -T` creates a fresh directory `blackcod-electron-39.2.7` inside `%{_builddir}` and `cd`s into it before unzipping. Running `cp -a . %{buildroot}%{_libexecdir}/blackcod-electron/` ensures:
1. All files and subdirectories are copied recursively.
2. File permissions (executable bits) are preserved.
3. If any hidden dotfiles were introduced in future upstream releases, they are copied (unlike glob `*` which ignores dotfiles).
4. No self-referential nested directory is created because the target directory was pre-created via `install -d`.

---

## Unchallenged Areas

- **SELinux contexts**: Tested on default Fedora desktop environment; specific custom SELinux policies (e.g. strict confined domains) were not evaluated as BlackCod runs in standard user context.
- **Alternative architectures**: Upstream archive tested is `x86_64` (the target architecture of the pinned Electron release). ARM64 (`aarch64`) packaging was not tested as the spec pins `linux-x64`.
