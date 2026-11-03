# Project: BlackCod Electron Fedora RPM Packaging Fix

## Architecture
- RPM packaging specification for BlackCod Electron distribution (`packaging/fedora/blackcod-electron.spec`).
- Source archive extraction handling for official Electron release zip files (`electron-v*.zip`) and BlackCod application resources.
- RPM build lifecycle stages: `%prep`, `%build`, `%install`, `%files`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Archive Structure Investigation | Investigate official Electron release zip layout and %setup/unzip interaction | M1 | ORIGINAL_REQUEST.md § R1 |
| 2 | Spec File Correction | Fix %prep extraction and %install paths in packaging/fedora/blackcod-electron.spec | M1 | ORIGINAL_REQUEST.md § R2 |
| 3 | Build & Spec Validation | Validate spec syntax and build stages (rpmbuild / rpmlint) | M1 | ORIGINAL_REQUEST.md § Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Electron Archive Extraction & %install Path Correction | packaging/fedora/blackcod-electron.spec | none | DONE |

### Key Outputs & Verified Artifacts
- Modified file: `packaging/fedora/blackcod-electron.spec`
  - Added `%global debug_package %{nil}` (disables debuginfo generation for upstream pre-stripped binaries)
  - Retained `%setup -q -c -T` and `unzip -q %{SOURCE0}` (extracts flat zip archive into isolated working directory `.`)
  - Updated `%install` copy command to `cp -a . %{buildroot}%{_libexecdir}/blackcod-electron/`
  - Updated `%files` to `%license LICENSE LICENSES.chromium.html`
- Verified packages:
  - Source RPM: `/home/varchas/rpmbuild/SRPMS/blackcod-electron-39.2.7-1.fc44.src.rpm` (112.9 MB)
  - Binary RPM: `/home/varchas/rpmbuild/RPMS/x86_64/blackcod-electron-39.2.7-1.fc44.x86_64.rpm` (86.8 MB)
  - Executable runtime test passed: Electron 39.2.7, Node 22.21.1, Chrome 142.0.7444.235

## Code Layout
- Target spec file: `packaging/fedora/blackcod-electron.spec` (exclusively owned by Worker)
- Packaging source scripts: `packaging/fedora/`
- Documentation/metadata: `.agents/teamwork/`

## Interface Contracts
- Input: Official Electron release zip file (`electron-v%{electron_version}-linux-x64.zip`).
- Output: Standard RPM package directories under `%{buildroot}%{_libexecdir}/blackcod-electron/` and binaries/desktop files according to Fedora RPM packaging guidelines.
