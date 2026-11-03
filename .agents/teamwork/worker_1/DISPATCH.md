## Task Assignment: Worker 1 - Fix packaging/fedora/blackcod-electron.spec

- Working Directory: /mnt/windows/Users/Varchas/VCHS - Programming Folder/BlackCod/.agents/teamwork/worker_1/
- Original Request: /mnt/windows/Users/Varchas/VCHS - Programming Folder/BlackCod/.agents/teamwork/ORIGINAL_REQUEST.md
- Project Scope: /mnt/windows/Users/Varchas/VCHS - Programming Folder/BlackCod/.agents/teamwork/orchestrator_1/PROJECT.md
- Explorer 1 Report: /mnt/windows/Users/Varchas/VCHS - Programming Folder/BlackCod/.agents/teamwork/explorer_1/handoff.md
- Explorer 2 Report: /mnt/windows/Users/Varchas/VCHS - Programming Folder/BlackCod/.agents/teamwork/explorer_2/handoff.md
- Spec Miner 1 Report: /mnt/windows/Users/Varchas/VCHS - Programming Folder/BlackCod/.agents/teamwork/spec_miner_1/handoff.md

### Exclusive Write Ownership
You exclusively own and may edit:
- `packaging/fedora/blackcod-electron.spec`

DO NOT edit any other project files or metadata belonging to other agents.

### Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

### Objective
Update `packaging/fedora/blackcod-electron.spec` following Fedora RPM packaging standards:
1. Add `%global debug_package %{nil}` at the top of the spec file to disable debuginfo generation for precompiled upstream Electron binaries.
2. In `%prep`, maintain `%setup -q -c -T` and `unzip -q %{SOURCE0}`.
3. In `%install`, change `cp -a electron-v%{version}-linux-x64/.` to `cp -a . \` copying directly from the current build directory into `%{buildroot}%{_libexecdir}/blackcod-electron/`.
4. In `%files`, update `%license` declarations to `%license LICENSE LICENSES.chromium.html` to follow Fedora packaging guidelines and avoid duplicate file ownership warnings.
5. Run build and verification commands:
   - `rpmspec -P packaging/fedora/blackcod-electron.spec`
   - `rpmlint packaging/fedora/blackcod-electron.spec`
   - `rpmbuild -bp packaging/fedora/blackcod-electron.spec`
   - `rpmbuild -bi packaging/fedora/blackcod-electron.spec`
   - `rpmbuild -ba packaging/fedora/blackcod-electron.spec`
   Verify that all stages pass cleanly.
6. Record all actions, changes made, commands executed, and command outputs in `.agents/teamwork/worker_1/changes.md` and `.agents/teamwork/worker_1/handoff.md`.

## 2026-11-03T18:11:47Z
You are Worker 1. Your assigned working directory is:
/mnt/windows/Users/Varchas/VCHS - Programming Folder/BlackCod/.agents/teamwork/worker_1/

You MUST read the following files before starting your work:
1. /mnt/windows/Users/Varchas/VCHS - Programming Folder/BlackCod/.agents/teamwork/ORIGINAL_REQUEST.md
2. /mnt/windows/Users/Varchas/VCHS - Programming Folder/BlackCod/.agents/teamwork/worker_1/DISPATCH.md
3. /mnt/windows/Users/Varchas/VCHS - Programming Folder/BlackCod/.agents/teamwork/explorer_1/handoff.md
4. /mnt/windows/Users/Varchas/VCHS - Programming Folder/BlackCod/.agents/teamwork/explorer_2/handoff.md
5. /mnt/windows/Users/Varchas/VCHS - Programming Folder/BlackCod/.agents/teamwork/spec_miner_1/handoff.md

### Exclusive Write Ownership
You exclusively own and may edit:
`packaging/fedora/blackcod-electron.spec`
Do NOT edit other project files.

### Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

### Implementation Tasks
1. Edit `packaging/fedora/blackcod-electron.spec` to apply the Fedora packaging solution:
   - Add `%global debug_package %{nil}` to disable debuginfo generation on precompiled binaries.
   - In `%prep`, retain `%setup -q -c -T` and `unzip -q %{SOURCE0}`.
   - In `%install`, change `cp -a electron-v%{version}-linux-x64/. \` to `cp -a . \` copying from the active build directory into `%{buildroot}%{_libexecdir}/blackcod-electron/`.
   - In `%files`, update license references to `%license LICENSE LICENSES.chromium.html`.
2. Run build and verification commands:
   - `rpmspec -P packaging/fedora/blackcod-electron.spec`
   - `rpmlint packaging/fedora/blackcod-electron.spec`
   - `rpmbuild -bp packaging/fedora/blackcod-electron.spec`
   - `rpmbuild -bi packaging/fedora/blackcod-electron.spec`
   - `rpmbuild -ba packaging/fedora/blackcod-electron.spec`
3. Document all changes in `/mnt/windows/Users/Varchas/VCHS - Programming Folder/BlackCod/.agents/teamwork/worker_1/changes.md`.
4. Write your completion report in `/mnt/windows/Users/Varchas/VCHS - Programming Folder/BlackCod/.agents/teamwork/worker_1/handoff.md` with full command outputs.
5. Notify the parent orchestrator via send_message when complete.
