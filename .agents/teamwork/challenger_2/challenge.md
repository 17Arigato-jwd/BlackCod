# Empirical Challenge Report: RPM Package Integrity Verification

**Target Package**: `blackcod-electron-39.2.7-1.fc44.x86_64.rpm`  
**Spec File**: `packaging/fedora/blackcod-electron.spec`  
**Reviewer**: Challenger 2 (Empirical Challenger: critic, specialist)  
**Date**: 2026-11-04  

---

## Challenge Summary

**Overall risk assessment**: **LOW**

The generated RPM package `blackcod-electron-39.2.7-1.fc44.x86_64.rpm` demonstrates strong empirical integrity:
- Clean build across `%prep`, `%build`, `%install`, and packaging stages in a fresh, isolated buildroot.
- All 8 ELF binaries (`electron`, `chrome-sandbox`, `chrome_crashpad_handler`, `libEGL.so`, `libGLESv2.so`, `libffmpeg.so`, `libvk_swiftshader.so`, `libvulkan.so.1`) have valid headers and full runtime dynamic linker symbol resolution (`ldd` reported zero unresolved dependencies).
- Direct execution of the extracted `electron` binary verified runtime viability, correctly identifying its version (`v22.21.1` Node.js / `39.2.7` Electron / Chrome `142.0.7444.235` / V8 `14.2.231.21-electron.0`).
- File permissions and ownership in the payload are secure and conform to standard RPM packaging practices (`0755` for directories/executables/libraries, `0644` for data/assets, all owned by `root:root`).

---

## Challenges

### [Low] Challenge 1: Private Shared Library `Provides` Pollution

- **Assumption challenged**: Shared libraries installed under a private application directory (`%{_libexecdir}/blackcod-electron/`) should automatically declare system-level `Provides:` in RPM metadata.
- **Attack scenario**: The package exposes generic `Provides:` tags for `libEGL.so()(64bit)`, `libGLESv2.so()(64bit)`, `libvulkan.so.1()(64bit)`, and `libffmpeg.so()(64bit)`. Because these libraries reside in `/usr/libexec/blackcod-electron/` and are NOT on the system `ldconfig` cache path (`/etc/ld.so.conf.d/`), a third-party package on the system requiring `libvulkan.so.1` or `libEGL.so` might satisfy its dependency using `blackcod-electron` in DNF/RPM solver, yet fail to locate them at runtime via the standard dynamic linker.
- **Blast radius**: Low. `blackcod-electron` is intended as a private dependency for BlackCod in COPR. However, on multi-package systems, un-isolated `Provides` can confuse transaction resolution if system libraries (`mesa-libEGL`, `vulkan-loader`) are missing.
- **Mitigation**: Add standard Fedora private library filtering in `packaging/fedora/blackcod-electron.spec`:
  ```spec
  %global __provides_exclude_from ^%{_libexecdir}/blackcod-electron/.*$
  ```

---

### [Low] Challenge 2: Duplicate File Installation for License Files

- **Assumption challenged**: Running `cp -a . %{buildroot}%{_libexecdir}/blackcod-electron/` followed by `%license LICENSE LICENSES.chromium.html` in `%files` maintains a clean, single-copy file tree.
- **Attack scenario**: Because `cp -a .` copies the entire working directory into `%{buildroot}%{_libexecdir}/blackcod-electron/`, `LICENSE` and `LICENSES.chromium.html` exist at:
  1. `/usr/libexec/blackcod-electron/LICENSE` and `/usr/libexec/blackcod-electron/LICENSES.chromium.html` (15.1 MB)
  2. `/usr/share/licenses/blackcod-electron/LICENSE` and `/usr/share/licenses/blackcod-electron/LICENSES.chromium.html` (15.1 MB)
- **Blast radius**: Low. Consumes approximately 15 MB of duplicate uncompressed disk space. It does not trigger RPM unpackaged or duplicate file errors because they reside at distinct paths.
- **Mitigation**: Optionally remove the license files from `%{buildroot}%{_libexecdir}/blackcod-electron/` after `cp -a .` or keep them as-is (many Electron distributions expect `LICENSES.chromium.html` in the root app directory).

---

### [Informational] Challenge 3: Integration with `packaging/fedora/blackcod` Wrapper Script

- **Assumption challenged**: The BlackCod application can execute `blackcod-electron` out-of-the-box using the current launcher script.
- **Attack scenario**: `packaging/fedora/blackcod` executes `exec /usr/bin/electron /usr/libexec/blackcod "$@"`. However, `blackcod-electron` installs its binary to `/usr/libexec/blackcod-electron/electron` and does not provide `/usr/bin/electron`.
- **Blast radius**: The `blackcod-electron` package itself builds and installs properly. However, if BlackCod is run on a host relying exclusively on `blackcod-electron` (without Terra's `electron` package), `/usr/bin/electron` will not be found unless `blackcod` wrapper script points to `/usr/libexec/blackcod-electron/electron` or a symlink is created.
- **Mitigation**: Update `packaging/fedora/blackcod` or add an alternative symlink `/usr/bin/blackcod-electron -> /usr/libexec/blackcod-electron/electron` in `blackcod-electron.spec` or handle it in `blackcod.spec`.

---

### [Low] Challenge 4: Build Directory Concurrency Collision

- **Assumption challenged**: Running `rpmbuild` on the same host without `--define "_topdir ..."` safely supports concurrent worker/challenger builds.
- **Attack scenario**: Multiple agents running `rpmbuild` concurrently in default `~/rpmbuild` attempt to wipe and extract into `/home/varchas/rpmbuild/BUILD/blackcod-electron-39.2.7-build/blackcod-electron-39.2.7`, causing `unzip` file creation errors or missing license file errors mid-flight.
- **Blast radius**: Transient build failure during parallel execution. Isolated builds in pristine topdirs succeed 100% of the time.
- **Mitigation**: Standard practice in automated CI environments is building in isolated chroots (mock) or isolated `--define "_topdir <sandbox>"`.

---

## Stress Test Results

| Scenario | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|
| **Clean Buildroot Isolation** (`_topdir /tmp/challenger_2_rpmbuild`) | `%prep`, `%build`, `%install`, and `%files` complete cleanly from scratch | Clean exit code 0; generated SRPMS and binary RPMS without warnings | **PASS** |
| **Stage by Stage Reproducibility** (`-bp`, `-bc`, `-bi`, `-ba`) | Each individual phase transitions predictably | `-bp` (0), `-bc` (0), `-bi` (0), `-ba` (0) | **PASS** |
| **Payload Extraction & File Count** (`rpm2cpio` + `cpio`) | Extracts 74 runtime items + 2 licenses without corruption | 74 items under `/usr/libexec/blackcod-electron/`, 2 files under `/usr/share/licenses/blackcod-electron/` | **PASS** |
| **File Permissions & Ownership** (`rpm -qp --dump`) | Correct POSIX modes (0755 binaries/dirs, 0644 data), root:root | 0755 for `electron`, `chrome-*`, `.so` files, 0644 for `.pak`, `.dat`, `.json`, `root:root` | **PASS** |
| **Dynamic Library Linking (`ldd`)** | All NEEDED entries in ELF headers resolve on Fedora host | Zero unresolved symbols or missing libraries across all 8 ELF binaries | **PASS** |
| **RPATH / RUNPATH Verification** | `electron` locates local `libffmpeg.so` via `$ORIGIN` | `RPATH [$ORIGIN]` detected; `libffmpeg.so` resolves to local extracted directory | **PASS** |
| **Runtime Binary Viability** (`electron --version` & Node eval) | Binary executes in user space and exposes correct version metadata | Reports Node `v22.21.1`, Electron `39.2.7`, Chrome `142.0.7444.235`, V8 `14.2.231.21-electron.0` | **PASS** |
| **SHA256 Integrity Verification** | Spec validates source archive checksum | Checksum `2f5285ef...` matched `electron-v39.2.7-linux-x64.zip` | **PASS** |

---

## Unchallenged Areas

- **Full X11 / Wayland Desktop Rendering**: GUI window rendering was not tested in this headless terminal environment without an active display server. The runtime binary was verified via CLI execution and node evaluation.
