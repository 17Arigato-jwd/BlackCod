# Technical Investigation: Electron Release Zip Archive Structure & RPM %setup Interactions

**Author:** Explorer 2  
**Date:** 2026-11-03  
**Target Package:** `packaging/fedora/blackcod-electron.spec`  
**Reference Original Request:** `.agents/teamwork/ORIGINAL_REQUEST.md` § R1  
**Target Issue:** `cp: cannot stat 'electron-v39.2.7-linux-x64/.': No such file or directory` during `%install`

---

## 1. Executive Summary

Official Electron release zip archives (`electron-v*.zip`) **do not contain any top-level enclosing directory**. All files and subdirectories are located directly at the root level of the archive (flat archive layout).

In `packaging/fedora/blackcod-electron.spec`, `%prep` invokes `%setup -q -c -T` followed by manual extraction with `unzip -q %{SOURCE0}`.
- `%setup -q -c -T` creates a package build directory named `blackcod-electron-39.2.7/` and changes into it.
- `unzip -q %{SOURCE0}` extracts all 74 items in the flat archive directly into `blackcod-electron-39.2.7/`.
- During `%install`, `rpmbuild` automatically sets the working directory to `blackcod-electron-39.2.7/`.
- The spec then executes:
  ```bash
  cp -a electron-v%{version}-linux-x64/. %{buildroot}%{_libexecdir}/blackcod-electron/
  ```
- Because no directory named `electron-v39.2.7-linux-x64` exists inside `blackcod-electron-39.2.7/`, `cp` fails with:
  `cp: cannot stat 'electron-v39.2.7-linux-x64/.': No such file or directory`.

The ideal, standard RPM packaging resolution is to update `%install` to copy directly from the current working directory (`.`):
```bash
cp -a . %{buildroot}%{_libexecdir}/blackcod-electron/
```
Additionally, because Electron ships pre-compiled binaries stripped of split DWARF debugging objects, standard Fedora RPM packaging requires `%global debug_package %{nil}` to prevent `find-debuginfo` from failing during RPM assembly.

---

## 2. Directory Layout of Official Electron Release Zip Archives

### 2.1 Archive Verification and Provenance
An official Electron release archive matching the spec was located and verified:
- **Archive Path:** `/home/varchas/.cache/electron/26ab0fe8debddb0d8281e61add684c976a653d398ff4118015560e9c6d4e7c40/electron-v39.2.7-linux-x64.zip`
- **Source URL:** `https://github.com/electron/electron/releases/download/v39.2.7/electron-v39.2.7-linux-x64.zip`
- **Observed SHA-256:** `2f5285ef563dca154aa247696dddef545d3d895dd9b227ed423ea0d43737c22c`
- **Spec Verification:** Exactly matches line 17 of `packaging/fedora/blackcod-electron.spec`:
  `echo "2f5285ef563dca154aa247696dddef545d3d895dd9b227ed423ea0d43737c22c  %{SOURCE0}" | sha256sum -c -`

### 2.2 Complete Archive Inventory
Inspection of `electron-v39.2.7-linux-x64.zip` using `unzip -l` and Python `zipfile` reveals:
- **Total entries:** 74 items
- **Top-level enclosing directory:** **None** (0)
- **Top-level subdirectories:** 2 (`locales/` and `resources/`)
- **Root-level files:** 18 files

#### Detailed Breakdown of Archive Structure:
```text
electron-v39.2.7-linux-x64.zip (Archive Root)
├── chrome-sandbox                 (15,328 bytes)
├── chrome_100_percent.pak         (115,176 bytes)
├── chrome_200_percent.pak         (188,186 bytes)
├── chrome_crashpad_handler        (1,545,800 bytes)
├── electron                       (199,855,320 bytes, main ELF executable)
├── icudtl.dat                     (10,467,680 bytes)
├── libEGL.so                      (251,224 bytes)
├── libGLESv2.so                   (6,344,096 bytes)
├── libffmpeg.so                   (2,681,808 bytes)
├── libvk_swiftshader.so           (4,702,912 bytes)
├── libvulkan.so.1                 (2,378,920 bytes)
├── LICENSE                        (1,096 bytes)
├── LICENSES.chromium.html         (15,102,119 bytes)
├── locales/                       (directory containing 55 language .pak files)
│   ├── am.pak, ar.pak, bg.pak, bn.pak, ca.pak, cs.pak, da.pak, de.pak, el.pak, ...
│   └── zh-CN.pak, zh-TW.pak
├── resources/                     (directory containing 1 file)
│   └── default_app.asar           (109,371 bytes)
├── resources.pak                  (6,490,209 bytes)
├── snapshot_blob.bin              (403,834 bytes)
├── v8_context_snapshot.bin        (776,865 bytes)
├── version                        (6 bytes: "v39.2.7\n")
└── vk_swiftshader_icd.json        (107 bytes)
```

### 2.3 Cross-Platform Release Consistency
Upstream Electron produces release zips directly from ninja/build artifacts (`out/Release` / `out/Default`). This archive convention is uniform across all official Electron release assets on Linux, Windows, and macOS (with macOS containing `Electron.app/` at root). Neither official source nor binary zip releases wrap Linux contents in a directory named `electron-v<version>-<os>-<arch>/`.

---

## 3. RPM `%setup` Macro Mechanics & Interaction with Flat Zip Archives

### 3.1 RPM `%setup` Macro Execution Architecture
When `rpmbuild` processes a spec file, it converts `%setup` directives into explicit shell commands in the generated `%prep` script (located in `/var/tmp/rpm-tmp.XXXXXX`).

The default behavior of RPM `%setup` assumes that source archives unpack into a single top-level directory named `%{name}-%{version}`.
Extraction is handled via `/usr/lib/rpm/rpmuncompress`, which delegates `.zip` handling to:
```bash
TZ=UTC /usr/bin/unzip -u -qq '<source_path>'
```

### 3.2 Evaluation Matrix of `%setup` Options with Flat Zip Archives

| Macro Invocation | Generated `%prep` Shell Sequence | Behavior with Flat Zip Archive | Result / Exit Status |
| :--- | :--- | :--- | :--- |
| **`%setup -q`** | `cd $RPM_BUILD_DIR`<br>`rm -rf %{name}-%{version}`<br>`rpmuncompress -x %{SOURCE0}`<br>`cd %{name}-%{version}`<br>`chmod -Rf ...` | Archive extracts into `$RPM_BUILD_DIR`. No `%{name}-%{version}` directory is created. `cd %{name}-%{version}` fails. | **FAILED** (`cd: %{name}-%{version}: No such file or directory`) |
| **`%setup -q -n <dir>`** | `cd $RPM_BUILD_DIR`<br>`rm -rf <dir>`<br>`rpmuncompress -x %{SOURCE0}`<br>`cd <dir>`<br>`chmod -Rf ...` | Archive extracts flat into `$RPM_BUILD_DIR`. `cd <dir>` fails because `<dir>` was never created by the archive. | **FAILED** (`cd: <dir>: No such file or directory`) |
| **`%setup -q -c`** | `cd $RPM_BUILD_DIR`<br>`rm -rf %{name}-%{version}`<br>`mkdir -p %{name}-%{version}`<br>`cd %{name}-%{version}`<br>`rpmuncompress -x %{SOURCE0}`<br>`chmod -Rf ...` | Creates `%{name}-%{version}` first and `cd`'s into it. Archive is unpacked directly inside it. Working directory is `%{_builddir}/%{name}-%{version}`. | **SUCCESS** in `%prep`. Extracted files are at `.`. |
| **`%setup -q -c -n <dir>`** | `cd $RPM_BUILD_DIR`<br>`rm -rf <dir>`<br>`mkdir -p <dir>`<br>`cd <dir>`<br>`rpmuncompress -x %{SOURCE0}`<br>`chmod -Rf ...` | Creates `<dir>` first and `cd`'s into it. Archive unpacked inside `<dir>`. Working directory is `%{_builddir}/<dir>`. | **SUCCESS** in `%prep`. Extracted files are at `.`. |
| **`%setup -q -c -T`** | `cd $RPM_BUILD_DIR`<br>`rm -rf %{name}-%{version}`<br>`mkdir -p %{name}-%{version}`<br>`cd %{name}-%{version}`<br>`chmod -Rf ...` | Creates `%{name}-%{version}` and `cd`'s into it. `-T` disables automatic `rpmuncompress`. Manual commands (`unzip`, checksum) execute inside `%{name}-%{version}`. | **SUCCESS** in `%prep`. Extracted files are at `.`. |
| **`%setup -q -T -b 0`** | `cd $RPM_BUILD_DIR`<br>`rm -rf %{name}-%{version}`<br>`rpmuncompress -x %{SOURCE0}`<br>`cd %{name}-%{version}` | Unpacks before changing directory without creating the directory. | **FAILED** (`cd: No such file or directory`) |
| **`%setup -q -T -a 0`** | `cd $RPM_BUILD_DIR`<br>`rm -rf %{name}-%{version}`<br>`cd %{name}-%{version}`<br>`rpmuncompress -x %{SOURCE0}` | Attempts `cd %{name}-%{version}` before creating it. | **FAILED** (`cd: No such file or directory`) |

### 3.3 Key Takeaways for Flat Archives
1. Any archive that lacks an enclosing folder **must** be unpacked with `%setup -c` (or manual `mkdir` + `cd`) to avoid polluting the parent `$RPM_BUILD_DIR` and triggering directory change errors.
2. When `%setup -c` is used, the created directory becomes the active working directory for **all** subsequent RPM stages: `%prep`, `%build`, and `%install`.
3. Consequently, all files unpacked into that directory reside directly at `.` (the current working directory) during `%install`.

---

## 4. Root Cause Analysis: `packaging/fedora/blackcod-electron.spec`

### 4.1 Spec Inspection
In `packaging/fedora/blackcod-electron.spec`:
```spec
Name:           blackcod-electron
Version:        39.2.7
...
Source0:        https://github.com/electron/electron/releases/download/v%{version}/electron-v%{version}-linux-x64.zip
...
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

### 4.2 Script Execution Trace
1. **`%prep` execution:**
   ```bash
   cd "/tmp/rpmbuild/BUILD/blackcod-electron-39.2.7-build"
   rm -rf 'blackcod-electron-39.2.7'
   /usr/bin/mkdir -p 'blackcod-electron-39.2.7'
   cd 'blackcod-electron-39.2.7'
   /usr/bin/chmod -Rf a+rX,u+w,g-w,o-w .
   echo "2f5285ef563dca154aa247696dddef545d3d895dd9b227ed423ea0d43737c22c  /tmp/rpmbuild/SOURCES/electron-v39.2.7-linux-x64.zip" | sha256sum -c -
   unzip -q /tmp/rpmbuild/SOURCES/electron-v39.2.7-linux-x64.zip
   ```
   At the end of `%prep`, the current directory is `.../BUILD/blackcod-electron-39.2.7-build/blackcod-electron-39.2.7/`.
   Its contents are:
   - `./electron`
   - `./LICENSE`
   - `./LICENSES.chromium.html`
   - `./locales/`
   - `./resources/`
   - (all other 18 root files and 2 subdirectories)

2. **`%install` execution:**
   RPM begins `%install` with:
   ```bash
   cd "/tmp/rpmbuild/BUILD/blackcod-electron-39.2.7-build"
   cd 'blackcod-electron-39.2.7'
   install -d /tmp/rpmbuild/BUILD/blackcod-electron-39.2.7-build/BUILDROOT/usr/libexec/blackcod-electron
   cp -a electron-v39.2.7-linux-x64/. \
     /tmp/rpmbuild/BUILD/blackcod-electron-39.2.7-build/BUILDROOT/usr/libexec/blackcod-electron/
   ```
3. **The Failure Point:**
   `cp` attempts to access `./electron-v39.2.7-linux-x64/.`.
   Because no such directory was ever created (the zip archive has no enclosing folder, and `%setup -c` created `blackcod-electron-39.2.7`, not `electron-v39.2.7-linux-x64`), `cp` emits:
   ```text
   cp: cannot stat 'electron-v39.2.7-linux-x64/.': No such file or directory
   error: Bad exit status from /var/tmp/rpm-tmp.XXXXXX (%install)
   ```

---

## 5. Solutions and Packaging Best Practices

### 5.1 Solution Option 1: Copy from Current Working Directory `.` (Recommended)
Retain `%setup -q -c -T` and `unzip -q %{SOURCE0}` in `%prep`, and adjust `%install`:
```spec
%install
install -d %{buildroot}%{_libexecdir}/blackcod-electron
cp -a . %{buildroot}%{_libexecdir}/blackcod-electron/
```

#### Why Solution 1 is Preferred:
- **Standard RPM Idiom:** `%setup -c` establishes the package's top-level build root (`%{name}-%{version}`). Working from the root of that build directory in `%build` and `%install` is standard Fedora practice.
- **Cleanliness:** Avoids artificial nested subdirectories (`blackcod-electron-39.2.7/electron-v39.2.7-linux-x64/`).
- **Complete Ingestion:** `cp -a .` copies all files and directories into `%{buildroot}%{_libexecdir}/blackcod-electron/` without omitting any hidden or nested assets.

### 5.2 Solution Option 2: Extract to Subdirectory with `unzip -d`
Alternatively, modify `%prep`:
```spec
%prep
%setup -q -c -T
echo "2f5285ef563dca154aa247696dddef545d3d895dd9b227ed423ea0d43737c22c  %{SOURCE0}" | sha256sum -c -
unzip -q %{SOURCE0} -d electron-v%{version}-linux-x64
```
While this allows the existing `cp -a electron-v%{version}-linux-x64/.` line in `%install` to succeed, it introduces unnecessary directory indirection inside `%{_builddir}/blackcod-electron-%{version}/` and deviates from idiomatic Fedora packaging.

### 5.3 Additional Required Setting: `%global debug_package %{nil}`
During testing of `%install` and `%files` packaging, Fedora's build root post-install processing triggers `find-debuginfo`.
Because official Electron releases are pre-compiled and pre-stripped, with split DWARF `.dwo` files omitted:
```text
During symbol reading: Could not find DWO CU ./libvulkan.so.1-dwo/61.dwo(...)
objcopy: ...: can't add section '.gdb_index': cause of error unknown
*** ERROR:: GDB exited with exit status 1 during index generation
```
In accordance with Fedora Packaging Guidelines for pre-built/binary-only software, debuginfo package generation must be explicitly disabled at the top of the spec file:
```spec
%global debug_package %{nil}
```

---

## 6. Verification and Reproduction

### 6.1 Reproducing the Failure
Running `rpmbuild -bi packaging/fedora/blackcod-electron.spec` with `Source0` pointing to `electron-v39.2.7-linux-x64.zip`:
```text
Executing(%prep): /bin/sh -e /var/tmp/rpm-tmp.Q8m5FF
.../SOURCES/electron-v39.2.7-linux-x64.zip: OK
Executing(%build): /bin/sh -e /var/tmp/rpm-tmp.w7Wizh
Executing(%install): /bin/sh -e /var/tmp/rpm-tmp.fzRmka
+ cd blackcod-electron-39.2.7
+ install -d .../BUILDROOT/usr/libexec/blackcod-electron
+ cp -a electron-v39.2.7-linux-x64/. .../BUILDROOT/usr/libexec/blackcod-electron/
cp: cannot stat 'electron-v39.2.7-linux-x64/.': No such file or directory
error: Bad exit status from /var/tmp/rpm-tmp.fzRmka (%install)
```
Status: **100% reproduced**.

### 6.2 Validating the Fix
Applying Solution 1 (`cp -a .`) and `%global debug_package %{nil}`:
- **`rpmbuild -bp` (Prep phase):** PASSED. Directory `blackcod-electron-39.2.7` created, checksum validated, 74 items extracted.
- **`rpmbuild -bi` (Install phase):** PASSED. All 20 root directory items (18 files + 2 directories) successfully copied to `%{buildroot}%{_libexecdir}/blackcod-electron/`.
- **`rpmbuild -bb` (Binary RPM generation):** PASSED. Binary RPM produced without path or extraction errors.
