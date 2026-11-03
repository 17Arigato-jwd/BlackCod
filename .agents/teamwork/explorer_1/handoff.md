# Handoff Report: Spec %prep, %setup, and %install Analysis

## 1. Observation
1. **Spec File (`packaging/fedora/blackcod-electron.spec`)**:
   - Lines 15–18:
     ```spec
     %prep
     %setup -q -c -T
     echo "2f5285ef563dca154aa247696dddef545d3d895dd9b227ed423ea0d43737c22c  %{SOURCE0}" | sha256sum -c -
     unzip -q %{SOURCE0}
     ```
   - Lines 22–26:
     ```spec
     %install
     install -d %{buildroot}%{_libexecdir}/blackcod-electron
     cp -a electron-v%{version}-linux-x64/. \
       %{buildroot}%{_libexecdir}/blackcod-electron/
     ```
2. **Macro Expansion via `rpmspec -P packaging/fedora/blackcod-electron.spec`**:
   ```bash
   %prep
   cd '/home/varchas/rpmbuild/BUILD/blackcod-electron-39.2.7-build'
   rm -rf 'blackcod-electron-39.2.7'
   /usr/bin/mkdir -p 'blackcod-electron-39.2.7'
   cd 'blackcod-electron-39.2.7'
   /usr/bin/chmod -Rf a+rX,u+w,g-w,o-w .

   echo "2f5285ef563dca154aa247696dddef545d3d895dd9b227ed423ea0d43737c22c  /home/varchas/rpmbuild/SOURCES/electron-v39.2.7-linux-x64.zip" | sha256sum -c -
   unzip -q /home/varchas/rpmbuild/SOURCES/electron-v39.2.7-linux-x64.zip
   ```
3. **Archive Directory Structure (`unzip -l electron-v39.2.7-linux-x64.zip`)**:
   Official Electron release archive contains top-level root items: `electron`, `chrome-sandbox`, `libEGL.so`, `libffmpeg.so`, `libvulkan.so.1`, `locales/`, `resources/`, `LICENSE`, `LICENSES.chromium.html`, etc.
   No enclosing directory named `electron-v39.2.7-linux-x64/` exists within the archive.
4. **Build Reproduction (`rpmbuild -bi --short-circuit packaging/fedora/blackcod-electron.spec`)**:
   In `%install`, RPM executes:
   ```bash
   + cd blackcod-electron-39.2.7
   + install -d /home/varchas/rpmbuild/BUILD/blackcod-electron-39.2.7-build/BUILDROOT/usr/libexec/blackcod-electron
   + cp -a electron-v39.2.7-linux-x64/. /home/varchas/rpmbuild/BUILD/blackcod-electron-39.2.7-build/BUILDROOT/usr/libexec/blackcod-electron/
   cp: cannot stat 'electron-v39.2.7-linux-x64/.': No such file or directory
   error: Bad exit status from /var/tmp/rpm-tmp.GhEbgA (%install)
   ```
5. **Debug Package Issue During Full Build**:
   When testing a build with the `cp` command fixed (`cp -a .`), rpmbuild failed in `/usr/lib/rpm/find-debuginfo.sh`:
   `*** ERROR:: GDB exited with exit status 1 during index generation`
   Adding `%global debug_package %{nil}` (as done in `packaging/fedora/blackcod.spec:8`) resolved the issue and allowed binary package generation to complete cleanly (`Wrote: .../RPMS/x86_64/blackcod-electron-39.2.7-1.fc44.x86_64.rpm`).

---

## 2. Logic Chain
1. From Observation 2, `%setup -q -c -T` creates a dedicated directory `blackcod-electron-39.2.7` inside the RPM build root and `cd`s into it.
2. From Observation 1, `unzip -q %{SOURCE0}` runs inside `blackcod-electron-39.2.7` without specifying an extraction destination (`-d`).
3. From Observation 3, `electron-v39.2.7-linux-x64.zip` has no internal enclosing root folder; all files extract directly into the current working directory (`blackcod-electron-39.2.7/`).
4. From Observation 4, `%install` executes with `blackcod-electron-39.2.7/` as the working directory.
5. In Observation 1 and 4, `%install` attempts `cp -a electron-v%{version}-linux-x64/. %{buildroot}%{_libexecdir}/blackcod-electron/`. Because no directory named `electron-v%{version}-linux-x64` was created by either `unzip` or the zip archive, this path does not exist.
6. Therefore, the failure `cp: cannot stat 'electron-v39.2.7-linux-x64/.': No such file or directory` is directly caused by a mismatch between the assumed directory name and the actual flat extraction structure in `blackcod-electron-39.2.7/`.
7. From Observation 5, precompiled Electron binaries also cause `find-debuginfo.sh` to fail unless `%global debug_package %{nil}` is defined.

---

## 3. Caveats
- Architecture scope: The investigation specifically inspected `electron-v39.2.7-linux-x64.zip`. Other architectures (e.g., `arm64`, `ia32`) follow the exact same upstream packaging structure (flat archive root), but were not independently decompressed here.
- RPM version: Tested under Fedora RPM version 6.0.2 / 4.19 macro behaviors.
- No other packaging scripts in `packaging/fedora/` were found that reference `blackcod-electron`.

---

## 4. Conclusion
1. **Root Cause**: The spec file assumes that `unzip -q %{SOURCE0}` produces a directory named `electron-v%{version}-linux-x64/`, but official Electron zip archives are flat. The extracted binaries are located directly in the current working directory (`.`), which is `%{_builddir}/blackcod-electron-%{version}`.
2. **Recommended Action**:
   - In `packaging/fedora/blackcod-electron.spec`, change the `%install` copy command (line 24) from:
     ```spec
     cp -a electron-v%{version}-linux-x64/. \
       %{buildroot}%{_libexecdir}/blackcod-electron/
     ```
     to:
     ```spec
     cp -a . \
       %{buildroot}%{_libexecdir}/blackcod-electron/
     ```
   - Add `%global debug_package %{nil}` at the top of `packaging/fedora/blackcod-electron.spec` to prevent GDB index generation failure on precompiled stripped binaries.

---

## 5. Verification Method
1. **Spec Parsing**:
   ```bash
   rpmspec -P packaging/fedora/blackcod-electron.spec
   ```
   Verify that macro expansion resolves paths cleanly without syntax errors.
2. **Build Stage Verification**:
   ```bash
   rpmbuild -bi packaging/fedora/blackcod-electron.spec
   ```
   Verify that `%install` copies all assets into `%{buildroot}%{_libexecdir}/blackcod-electron` without any missing path errors.
3. **Invalidation Conditions**:
   - If `electron-v*.zip` ever changes upstream structure to include an enclosing root folder, extraction directly to `.` would fail or create a subfolder.
   - If `%setup -c` is removed, flat zip extraction would pollute `%_builddir`.
