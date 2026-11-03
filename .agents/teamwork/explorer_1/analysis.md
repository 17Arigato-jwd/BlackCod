# Comprehensive Investigation: Electron RPM Archive Structure & Spec %install Failure

## Executive Summary
The `%install` failure (`cp: cannot stat 'electron-v39.2.7-linux-x64/.': No such file or directory`) occurs because official Electron binary release zip files (`electron-v*.zip`) are flat archives without any top-level enclosing directory. In `%prep`, `%setup -q -c -T` creates and enters the build directory `blackcod-electron-39.2.7/`, where `unzip -q %{SOURCE0}` extracts the Electron payload directly into the root of this working directory (`.`), rather than into a subfolder named `electron-v%{version}-linux-x64/`. Consequently, when `%install` runs in `blackcod-electron-39.2.7/` and attempts to copy from `electron-v%{version}-linux-x64/.`, the target path does not exist.

---

## 1. Codebase & Spec File Analysis

### 1.1 Spec File Context: `packaging/fedora/blackcod-electron.spec`
Lines 1–35 of `packaging/fedora/blackcod-electron.spec`:
```spec
1: Name:           blackcod-electron
2: Version:        39.2.7
3: Release:        1%{?dist}
4: Summary:        Pinned Electron runtime for BlackCod
5: License:        MIT AND BSD-3-Clause AND BSD-2-Clause AND Apache-2.0 AND LGPL-2.1-or-later
6: URL:            https://www.electronjs.org/
7: Source0:        https://github.com/electron/electron/releases/download/v%{version}/electron-v%{version}-linux-x64.zip
8: BuildRequires:  unzip
...
15: %prep
16: %setup -q -c -T
17: echo "2f5285ef563dca154aa247696dddef545d3d895dd9b227ed423ea0d43737c22c  %{SOURCE0}" | sha256sum -c -
18: unzip -q %{SOURCE0}
19: 
20: %build
21: 
22: %install
23: install -d %{buildroot}%{_libexecdir}/blackcod-electron
24: cp -a electron-v%{version}-linux-x64/. \
25:   %{buildroot}%{_libexecdir}/blackcod-electron/
26: 
27: %files
28: %license %{_libexecdir}/blackcod-electron/LICENSE
29: %license %{_libexecdir}/blackcod-electron/LICENSES.chromium.html
30: %{_libexecdir}/blackcod-electron/
```

### 1.2 Macro Expansion Analysis (`rpmspec -P`)
Running `rpmspec -P packaging/fedora/blackcod-electron.spec` reveals how RPM expands `%prep` and `%install`:

```bash
%prep
cd '/home/varchas/rpmbuild/BUILD/blackcod-electron-39.2.7-build'
rm -rf 'blackcod-electron-39.2.7'
/usr/bin/mkdir -p 'blackcod-electron-39.2.7'
cd 'blackcod-electron-39.2.7'
/usr/bin/chmod -Rf a+rX,u+w,g-w,o-w .

echo "2f5285ef563dca154aa247696dddef545d3d895dd9b227ed423ea0d43737c22c  /home/varchas/rpmbuild/SOURCES/electron-v39.2.7-linux-x64.zip" | sha256sum -c -
unzip -q /home/varchas/rpmbuild/SOURCES/electron-v39.2.7-linux-x64.zip

%build

%install
install -d /home/varchas/rpmbuild/BUILD/blackcod-electron-39.2.7-build/BUILDROOT/usr/libexec/blackcod-electron
cp -a electron-v39.2.7-linux-x64/. \
  /home/varchas/rpmbuild/BUILD/blackcod-electron-39.2.7-build/BUILDROOT/usr/libexec/blackcod-electron/
```

---

## 2. Deep Dive: %prep, %setup, and Extraction Mechanics

### 2.1 The `%setup` Macro Flags
The `%setup` macro accepts standard options controlling directory creation and archive extraction:
- `-q`: Quiet. Suppresses verbose output during directory preparation and archive decompression.
- `-c`: Create directory. RPM creates a directory named `%{name}-%{version}` (here: `blackcod-electron-39.2.7`) inside `%_builddir` and enters it via `cd`. Without `-c`, `%setup` assumes the source archive will unpack into `%{name}-%{version}` and only does `cd` without creating the directory first.
- `-T`: Skip default extraction. In RPM, `%setup` by default attempts to unpack `Source0` using `rpmuncompress -x`. Specifying `-T` instructs RPM *not* to unpack `Source0` automatically.
- `-n <dir>` (not used): Overrides the default build directory name. Since it was omitted, the directory defaults to `%{name}-%{version}` (`blackcod-electron-39.2.7`).
- `-a <N>` / `-b <N>` (not used): Unpacks Source N after (`-a`) or before (`-b`) changing into the directory.

### 2.2 Why `%setup -q -c -T` Was Used
The author intended to perform a cryptographic integrity check before unpacking:
```bash
echo "2f5285ef563dca154aa247696dddef545d3d895dd9b227ed423ea0d43737c22c  %{SOURCE0}" | sha256sum -c -
unzip -q %{SOURCE0}
```
Because `-T` was passed, RPM did not unpack `Source0` automatically. The author verified the sha256 checksum and then invoked `unzip -q %{SOURCE0}` manually.

---

## 3. Investigation of Official Electron Release Zip Layout

### 3.1 Zip File Structure Verification
We inspected the official release archive `electron-v39.2.7-linux-x64.zip` (verified SHA256: `2f5285ef563dca154aa247696dddef545d3d895dd9b227ed423ea0d43737c22c`).

Running `unzip -l electron-v39.2.7-linux-x64.zip` demonstrates that the archive has **no top-level root folder**:
```
  Length      Date    Time    Name
---------  ---------- -----   ----
   689991  01-01-1980 00:00   locales/hu.pak
   599512  01-01-1980 00:00   locales/nl.pak
      107  01-01-1980 00:00   vk_swiftshader_icd.json
 ...
 15102119  01-01-1980 00:00   LICENSES.chromium.html
 199855320  01-01-1980 00:00   electron
     15328  01-01-1980 00:00   chrome-sandbox
   2681808  01-01-1980 00:00   libffmpeg.so
   2378920  01-01-1980 00:00   libvulkan.so.1
      1096  01-01-1980 00:00   LICENSE
```

Unique top-level entries in `electron-v39.2.7-linux-x64.zip`:
- `chrome_100_percent.pak`
- `chrome_200_percent.pak`
- `chrome_crashpad_handler`
- `chrome-sandbox`
- `electron` (main executable)
- `icudtl.dat`
- `libEGL.so`
- `libffmpeg.so`
- `libGLESv2.so`
- `libvk_swiftshader.so`
- `libvulkan.so.1`
- `LICENSE`
- `LICENSES.chromium.html`
- `locales/`
- `resources/`
- `resources.pak`
- `snapshot_blob.bin`
- `v8_context_snapshot.bin`
- `version`
- `vk_swiftshader_icd.json`

There is **no** `electron-v39.2.7-linux-x64/` directory inside the zip file.

---

## 4. Root Cause Analysis of the %install Failure

### 4.1 Step-by-Step Execution Sequence
1. In `%prep`, RPM executes:
   ```bash
   mkdir -p blackcod-electron-39.2.7
   cd blackcod-electron-39.2.7
   ```
   Current directory is now `/home/varchas/rpmbuild/BUILD/blackcod-electron-39.2.7-build/blackcod-electron-39.2.7`.
2. The spec executes:
   ```bash
   unzip -q %{SOURCE0}
   ```
   Because `unzip` is called without `-d <dir>`, it unpacks all files directly into `.`, which is `blackcod-electron-39.2.7`.
   The files (`electron`, `resources/`, `locales/`, `LICENSE`, etc.) now sit directly in `/home/varchas/rpmbuild/BUILD/blackcod-electron-39.2.7-build/blackcod-electron-39.2.7/`.
3. In `%install`, RPM automatically restores the working directory:
   ```bash
   cd blackcod-electron-39.2.7
   ```
4. The spec runs:
   ```bash
   install -d %{buildroot}%{_libexecdir}/blackcod-electron
   cp -a electron-v%{version}-linux-x64/. \
     %{buildroot}%{_libexecdir}/blackcod-electron/
   ```
5. The shell evaluates `electron-v%{version}-linux-x64/.` as `electron-v39.2.7-linux-x64/.` relative to the current directory (`blackcod-electron-39.2.7/`).
6. Because no directory called `electron-v39.2.7-linux-x64` was ever created or extracted, `cp` fails immediately:
   ```
   cp: cannot stat 'electron-v39.2.7-linux-x64/.': No such file or directory
   error: Bad exit status from /var/tmp/rpm-tmp.GhEbgA (%install)
   ```

---

## 5. Secondary Findings & Packaging Requirements

During test execution of the build phases (`rpmbuild -bi` and `rpmbuild -ba`), two additional issues were observed:

### 5.1 Debuginfo / GDB Index Generation Failure
When copying the precompiled Electron binaries to the buildroot, `rpmbuild` runs post-install scripts including `/usr/lib/rpm/find-debuginfo.sh`.
Because Electron binaries are precompiled and stripped without separate DWO files, GDB index generation fails:
```
objcopy: /home/varchas/rpmbuild/BUILD/blackcod-electron-39.2.7-build/BUILDROOT/usr/libexec/blackcod-electron/...: can't add section '.gdb_index': cause of error unknown
*** ERROR:: GDB exited with exit status 1 during index generation
error: Bad exit status from /var/tmp/rpm-tmp.I3ABn6 (%install)
```
This requires disabling automatic debug package creation using:
```spec
%global debug_package %{nil}
```
This is consistent with `packaging/fedora/blackcod.spec` (line 8) and `packaging/fedora/README.md` (lines 36–37).

### 5.2 Duplicate File Warnings in `%files`
In `blackcod-electron.spec`:
```spec
%files
%license %{_libexecdir}/blackcod-electron/LICENSE
%license %{_libexecdir}/blackcod-electron/LICENSES.chromium.html
%{_libexecdir}/blackcod-electron/
```
Because `%{_libexecdir}/blackcod-electron/` recursively includes all directory contents, `LICENSE` and `LICENSES.chromium.html` are packaged twice, producing warnings:
```
warning: File listed twice: /usr/libexec/blackcod-electron/LICENSE
warning: File listed twice: /usr/libexec/blackcod-electron/LICENSES.chromium.html
```
While not fatal, this can be addressed according to Fedora packaging guidelines if desired.

---

## 6. Proposed Solutions

### Option A: Direct Copy from Working Directory (Recommended)
Since `%setup -q -c -T` already created and entered `blackcod-electron-39.2.7/`, and `unzip -q %{SOURCE0}` placed all files directly in `.`, simply copy from `.` in `%install`:

```spec
%install
install -d %{buildroot}%{_libexecdir}/blackcod-electron
cp -a . %{buildroot}%{_libexecdir}/blackcod-electron/
```

### Option B: Unpack into Named Subdirectory
Alternatively, if keeping `electron-v%{version}-linux-x64` in `%install` were desired:
```spec
%prep
%setup -q -c -T
echo "2f5285ef563dca154aa247696dddef545d3d895dd9b227ed423ea0d43737c22c  %{SOURCE0}" | sha256sum -c -
unzip -q %{SOURCE0} -d electron-v%{version}-linux-x64

%install
install -d %{buildroot}%{_libexecdir}/blackcod-electron
cp -a electron-v%{version}-linux-x64/. \
  %{buildroot}%{_libexecdir}/blackcod-electron/
```
*Assessment*: Option A is cleaner and idiomatic for RPM specs where `%setup -c` creates the top-level container directory. Creating unnecessary nested directories is redundant.

### Option C: Standard RPM Unpack via `%setup -q -c`
RPM 4.19 / RPM 6 natively supports `.zip` archives via `rpmuncompress -x`.
```spec
%prep
%setup -q -c
```
*Assessment*: This unpacks directly into `%{name}-%{version}/`, eliminating the manual `unzip` call. However, if the project strictly requires retaining the explicit `sha256sum` verification in `%prep`, Option A with `%setup -q -c -T` preserves that guarantee.
