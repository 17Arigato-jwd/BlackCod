# Handoff Report — Spec Miner 1: Fedora RPM Packaging Standards for Top-Level-Less Zip Archives

**To**: Parent Orchestrator (`dc8df9fd-5dca-46fb-a0d6-16d69e3e37bf`) / Downstream Implementer (Worker)  
**From**: Spec Miner 1  
**Date**: 2026-11-03  
**Working Directory**: `/mnt/windows/Users/Varchas/VCHS - Programming Folder/BlackCod/.agents/teamwork/spec_miner_1/`  
**Analysis File**: `/mnt/windows/Users/Varchas/VCHS - Programming Folder/BlackCod/.agents/teamwork/spec_miner_1/analysis.md`  

---

## 1. Observation

1. **Target Spec File**: `packaging/fedora/blackcod-electron.spec`
   - Lines 15-18:
     ```spec
     %prep
     %setup -q -c -T
     echo "2f5285ef563dca154aa247696dddef545d3d895dd9b227ed423ea0d43737c22c  %{SOURCE0}" | sha256sum -c -
     unzip -q %{SOURCE0}
     ```
   - Lines 22-25:
     ```spec
     %install
     install -d %{buildroot}%{_libexecdir}/blackcod-electron
     cp -a electron-v%{version}-linux-x64/. \
       %{buildroot}%{_libexecdir}/blackcod-electron/
     ```
   - Lines 27-30:
     ```spec
     %files
     %license %{_libexecdir}/blackcod-electron/LICENSE
     %license %{_libexecdir}/blackcod-electron/LICENSES.chromium.html
     %{_libexecdir}/blackcod-electron/
     ```

2. **Official Electron Release Archive Layout**:
   - Inspected `electron-v39.2.7-linux-x64.zip` via `unzip -l /home/varchas/.cache/electron/26ab0fe8debddb0d8281e61add684c976a653d398ff4118015560e9c6d4e7c40/electron-v39.2.7-linux-x64.zip`.
   - The archive contains 74 items (`electron`, `chrome-sandbox`, `locales/`, `resources/default_app.asar`, `LICENSE`, `LICENSES.chromium.html`, `libffmpeg.so`, etc.).
   - All entries are rooted at the top level of the archive with NO enclosing folder (e.g. no `electron-v39.2.7-linux-x64/` prefix).

3. **RPM Execution Trace**:
   - In `%prep`, `%setup -q -c -T` generates:
     ```sh
     rm -rf blackcod-electron-39.2.7
     /usr/bin/mkdir -p blackcod-electron-39.2.7
     cd blackcod-electron-39.2.7
     ```
   - The user script commands run inside `%{_builddir}/blackcod-electron-39.2.7/`.
   - `unzip -q %{SOURCE0}` extracts all 74 items directly into `.`.
   - At the beginning of `%install`, RPM automatically executes `cd blackcod-electron-39.2.7`.
   - Line 24 `cp -a electron-v%{version}-linux-x64/. ...` fails with:
     ```
     cp: cannot stat 'electron-v39.2.7-linux-x64/.': No such file or directory
     error: Bad exit status from /var/tmp/rpm-tmp.* (%install)
     ```

4. **Secondary Buildroot Post-Processing Failure Observed**:
   - When line 24 is changed to copy from `.`, `rpmbuild -bi` / `rpmbuild -ba` runs `find-debuginfo`.
   - Because upstream Electron binaries are pre-stripped and have missing DWARF DWO references, `find-debuginfo` fails:
     ```
     objcopy: ... can't add section '.gdb_index': cause of error unknown
     *** ERROR:: GDB exited with exit status 1 during index generation
     error: Bad exit status (%install)
     ```
   - The peer spec `packaging/fedora/blackcod.spec` line 8 includes `%global debug_package %{nil}` to prevent this.

5. **RPM %files Warning Observed**:
   - Packaging both `%{_libexecdir}/blackcod-electron/` and `%license %{_libexecdir}/blackcod-electron/LICENSE` emits:
     ```
     RPM build warnings:
         File listed twice: /usr/libexec/blackcod-electron/LICENSE
         File listed twice: /usr/libexec/blackcod-electron/LICENSES.chromium.html
     ```

---

## 2. Logic Chain

1. From Observation 2, official Electron release zips do not contain an enclosing top-level directory (`electron-v*.zip` is a flat archive).
2. From Observation 3, `%setup -c` creates `blackcod-electron-39.2.7` as the top-level container directory, and `cd`s into it. Running `unzip -q %{SOURCE0}` inside this directory unpacks the files directly into `.`.
3. From Observation 3, RPM ensures the working directory in `%install` is `blackcod-electron-39.2.7/`. The path `electron-v%{version}-linux-x64/` does not exist inside `blackcod-electron-39.2.7/`.
4. Therefore, referencing `electron-v%{version}-linux-x64/.` in `%install` fails with `cp: cannot stat`. The files must be copied from `.` (the current directory) to `%{buildroot}%{_libexecdir}/blackcod-electron/`.
5. From Observation 4, pre-compiled upstream binary packages in RPM cannot undergo debuginfo extraction via `find-debuginfo` without failing. Defining `%global debug_package %{nil}` in the spec preamble is the canonical Fedora RPM method for prebuilt binaries.
6. From Observation 5, Fedora Packaging Guidelines prescribe that `%license` in `%files` take paths relative to the build directory (e.g., `%license LICENSE LICENSES.chromium.html`), which installs them into `%{_defaultlicensedir}/%{name}/` and avoids duplicate file ownership warnings with `%{_libexecdir}/blackcod-electron/`.

---

## 3. Caveats

- In official Fedora primary repositories, shipping prebuilt upstream binary packages is restricted by Fedora's "No inclusion of pre-built binaries" policy. However, this spec is specifically designated for downstream COPR/standalone installation (as documented in `packaging/fedora/README.md` and `blackcod-electron.spec` description) so users can install BlackCod with its pinned Electron runtime without requiring external repositories.
- The sha256 checksum in line 17 (`2f5285ef563dca154aa247696dddef545d3d895dd9b227ed423ea0d43737c22c`) is hardcoded for Electron version `39.2.7`. If the `Version` tag is changed in the future, the checksum line must be updated accordingly.

---

## 4. Conclusion

The cleanest, standard Fedora packaging solution for `packaging/fedora/blackcod-electron.spec` consists of:
1. Adding `%global debug_package %{nil}` to disable debuginfo extraction for prebuilt binaries.
2. In `%prep`, retaining `%setup -q -c -T` and `unzip -q %{SOURCE0}` which cleanly creates the package build directory and unzips the flat archive into `.`.
3. In `%install`, changing `cp -a electron-v%{version}-linux-x64/.` to `cp -a . \`.
4. In `%files`, updating `%license` to `%license LICENSE LICENSES.chromium.html` to prevent file duplication warnings.

### Exact Recommended Diff
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

---

## 5. Verification Method

To independently verify the solution:

1. **Test `%prep` Stage (`rpmbuild -bp`)**:
   ```bash
   rpmbuild -bp packaging/fedora/blackcod-electron.spec
   ```
   *Expected*: Passes integrity check and uncompresses files into buildroot without warnings.

2. **Test `%install` Stage (`rpmbuild -bi`)**:
   ```bash
   rpmbuild -bi packaging/fedora/blackcod-electron.spec
   ```
   *Expected*: Passes `%install` without `cannot stat` or `find-debuginfo` errors.

3. **Test Full Package Build (`rpmbuild -ba`)**:
   ```bash
   rpmbuild -ba packaging/fedora/blackcod-electron.spec
   ```
   *Expected*: Successfully produces `.src.rpm` and `.x86_64.rpm` with exit code 0 and zero warnings.

4. **Invalidation Conditions**:
   - Upstream Electron modifies zip archive structure to include a leading root directory prefix.
   - The sha256 checksum of `electron-v39.2.7-linux-x64.zip` does not match line 17.
