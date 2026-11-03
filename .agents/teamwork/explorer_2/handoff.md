# Handoff Report: Electron Release Zip Archive Structure & RPM %setup Interactions

**Agent:** Explorer 2  
**Working Directory:** `/mnt/windows/Users/Varchas/VCHS - Programming Folder/BlackCod/.agents/teamwork/explorer_2/`  
**Target:** `packaging/fedora/blackcod-electron.spec`  
**Date:** 2026-11-03  
**Handoff Type:** Hard (Task complete)

---

## 1. Observation

1. **Official Electron Release Archive Layout:**
   - Archive evaluated: `/home/varchas/.cache/electron/26ab0fe8debddb0d8281e61add684c976a653d398ff4118015560e9c6d4e7c40/electron-v39.2.7-linux-x64.zip`
   - Archive SHA-256: `2f5285ef563dca154aa247696dddef545d3d895dd9b227ed423ea0d43737c22c` (verbatim match with `packaging/fedora/blackcod-electron.spec:17`).
   - Command: `unzip -l electron-v39.2.7-linux-x64.zip`
   - Total items: 74.
   - Top-level subdirectories: 2 (`locales/` with 55 files, `resources/` with 1 file `default_app.asar`).
   - Root-level files: 18 files (`electron`, `version`, `LICENSE`, `LICENSES.chromium.html`, `icudtl.dat`, `resources.pak`, `chrome-sandbox`, `chrome_crashpad_handler`, `chrome_100_percent.pak`, `chrome_200_percent.pak`, `snapshot_blob.bin`, `v8_context_snapshot.bin`, `vk_swiftshader_icd.json`, `libffmpeg.so`, `libEGL.so`, `libGLESv2.so`, `libvk_swiftshader.so`, `libvulkan.so.1`).
   - **Crucial Observation:** The archive contains **no top-level enclosing directory** (e.g., no `electron-v39.2.7-linux-x64/` prefix). All files extract flatly into whichever directory the extraction command is invoked in.

2. **Existing Spec Extraction & Install Logic:**
   - File: `packaging/fedora/blackcod-electron.spec:15-26`
   ```spec
   %prep
   %setup -q -c -T
   echo "2f5285ef563dca154aa247696dddef545d3d895dd9b227ed423ea0d43737c22c  %{SOURCE0}" | sha256sum -c -
   unzip -q %{SOURCE0}

   %build

   %install
   install -d %{buildroot}%{_libexecdir}/blackcod-electron
   cp -a electron-v%{version}-linux-x64/. \
     %{buildroot}%{_libexecdir}/blackcod-electron/
   ```

3. **Generated Shell Script for `%prep` (`/var/tmp/rpm-tmp.RexYdh`):**
   ```bash
   cd "/tmp/.../BUILD/blackcod-electron-39.2.7-build"
   rm -rf 'blackcod-electron-39.2.7'
   /usr/bin/mkdir -p 'blackcod-electron-39.2.7'
   cd 'blackcod-electron-39.2.7'
   /usr/bin/chmod -Rf a+rX,u+w,g-w,o-w .

   echo "2f5285ef563dca154aa247696dddef545d3d895dd9b227ed423ea0d43737c22c  %{SOURCE0}" | sha256sum -c -
   unzip -q %{SOURCE0}
   ```

4. **Generated Shell Script for `%install` (`/var/tmp/rpm-tmp.fzRmka`):**
   ```bash
   cd "/tmp/.../BUILD/blackcod-electron-39.2.7-build"
   cd 'blackcod-electron-39.2.7'
   install -d .../BUILDROOT/usr/libexec/blackcod-electron
   cp -a electron-v39.2.7-linux-x64/. .../BUILDROOT/usr/libexec/blackcod-electron/
   ```

5. **Verbatim Build Error (`rpmbuild -bi`):**
   ```text
   + cd blackcod-electron-39.2.7
   + install -d /tmp/.../BUILD/blackcod-electron-39.2.7-build/BUILDROOT/usr/libexec/blackcod-electron
   + cp -a electron-v39.2.7-linux-x64/. /tmp/.../BUILD/blackcod-electron-39.2.7-build/BUILDROOT/usr/libexec/blackcod-electron/
   cp: cannot stat 'electron-v39.2.7-linux-x64/.': No such file or directory
   error: Bad exit status from /var/tmp/rpm-tmp.fzRmka (%install)
   ```

6. **Behavior of `%setup` Macro Flags:**
   - `%setup -q` (without `-c`): unpacks into `$RPM_BUILD_DIR` and attempts `cd %{name}-%{version}`. Because the flat archive lacks that folder, `cd` fails with `cd: ... No such file or directory`.
   - `%setup -q -n <name>` (without `-c`): extracts into `$RPM_BUILD_DIR` and fails `cd <name>`.
   - `%setup -q -c`: creates `%{name}-%{version}`, `cd`'s into it, and unpacks `Source0` into `%{name}-%{version}` via `rpmuncompress`. Working directory during subsequent `%build` and `%install` is `%{name}-%{version}`.
   - `%setup -q -c -T`: creates `%{name}-%{version}` and `cd`'s into it, but suppresses automatic unpacking (`-T`), allowing manual checksum validation and extraction via `unzip -q %{SOURCE0}`.
   - All subsequent stages (`%build`, `%install`) start inside `%{_builddir}/%{name}-%{version}/` (i.e., `blackcod-electron-39.2.7/`).

7. **Pre-built Binary Debuginfo Behavior:**
   - In Fedora, `find-debuginfo` runs automatically during post-install packaging. Because upstream Electron binaries are pre-stripped and split DWO debug files are absent, `find-debuginfo` fails on `libvulkan.so.1` unless `%global debug_package %{nil}` is specified.

---

## 2. Logic Chain

1. **Premise 1 (From Observation 1):** Official Electron release archives are flat. Extracting `electron-v39.2.7-linux-x64.zip` does not create an `electron-v39.2.7-linux-x64/` directory.
2. **Premise 2 (From Observations 3 and 6):** `%setup -q -c -T` creates a directory named `blackcod-electron-39.2.7` inside the build tree and changes directory into it. The subsequent `unzip -q %{SOURCE0}` extracts the flat archive files directly into `blackcod-electron-39.2.7/`.
3. **Premise 3 (From Observation 4):** When `%install` starts, RPM automatically executes `cd blackcod-electron-39.2.7`.
4. **Deduction (Explaining Observation 5):** Because the extracted files reside directly in `blackcod-electron-39.2.7/`, looking for a nested subfolder `electron-v39.2.7-linux-x64` in the current directory (`./electron-v39.2.7-linux-x64/.`) fails with `No such file or directory`.
5. **Resolution Inference:** In `%install`, copying from the current directory `.` (`cp -a . %{buildroot}%{_libexecdir}/blackcod-electron/`) targets the exact location where `unzip` extracted the runtime files, matching the layout established by `%setup -c`.

---

## 3. Caveats

- **Alternative Fix (Option 2):** One could alternatively pass `-d electron-v%{version}-linux-x64` to `unzip -q` in `%prep`. However, this introduces an unnecessary extra subfolder layer inside `blackcod-electron-39.2.7/` and departs from standard Fedora packaging conventions where `%setup -c` establishes the root workspace.
- **Pre-built Binary Policy:** Electron is packaged here as a pre-built binary runtime. Fedora packaging guidelines require disabling debug packages (`%global debug_package %{nil}`) for binary-only redistributions lacking original compiler debug symbols.

---

## 4. Conclusion

1. **Archive Layout:** Official Electron release zip files (`electron-v*.zip`) are flat archives without an enclosing top-level directory.
2. **Root Cause:** `%install` erroneously attempted to copy from `electron-v%{version}-linux-x64/.`, expecting a nested folder that does not exist in the archive or build workspace.
3. **Recommended Fix for Worker:**
   In `packaging/fedora/blackcod-electron.spec`:
   - Keep `%prep` as:
     ```spec
     %prep
     %setup -q -c -T
     echo "2f5285ef563dca154aa247696dddef545d3d895dd9b227ed423ea0d43737c22c  %{SOURCE0}" | sha256sum -c -
     unzip -q %{SOURCE0}
     ```
   - Update `%install` line 24 to copy from `.`:
     ```spec
     %install
     install -d %{buildroot}%{_libexecdir}/blackcod-electron
     cp -a . \
       %{buildroot}%{_libexecdir}/blackcod-electron/
     ```
   - Add `%global debug_package %{nil}` at the top of the spec file to prevent `find-debuginfo` errors on the pre-built Electron binaries.

---

## 5. Verification Method

1. **Verify Archive Flat Structure:**
   ```bash
   unzip -l /home/varchas/.cache/electron/26ab0fe8debddb0d8281e61add684c976a653d398ff4118015560e9c6d4e7c40/electron-v39.2.7-linux-x64.zip | grep -E " (electron|resources/|locales/)"
   ```
   *Expected:* Output confirms `electron` has no directory prefix and only `resources/` and `locales/` have directory paths.

2. **Verify Spec `%prep` and `%install` Build Stages:**
   Create or test the modified spec using `rpmbuild`:
   ```bash
   rpmbuild --define="_topdir /tmp/rpmbuild" -bi packaging/fedora/blackcod-electron.spec
   ```
   *Expected:* Exit code 0, no `cannot stat` error, and all 20 runtime entries installed into `%{buildroot}%{_libexecdir}/blackcod-electron/`.

3. **Invalidation Condition:**
   If upstream Electron changes release zip generation to include an enclosing top-level folder (e.g., `electron-v*.zip` contains `electron-v39.2.7-linux-x64/electron`), `%setup -c` would create a duplicate directory layer. The verification command in step 1 will immediately detect this change.
