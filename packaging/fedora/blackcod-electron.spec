Name:           blackcod-electron
Version:        39.2.7
Release:        1%{?dist}
Summary:        Pinned Electron runtime for BlackCod
License:        MIT AND BSD-3-Clause AND BSD-2-Clause AND Apache-2.0 AND LGPL-2.1-or-later
URL:            https://www.electronjs.org/
Source0:        https://github.com/electron/electron/releases/download/v%{version}/electron-v%{version}-linux-x64.zip
BuildRequires:  unzip

%description
The pinned Electron runtime used by BlackCod. It is packaged separately so
dnf can install it as a dependency without requiring an external Electron
repository.

%prep
%setup -q -c -T
echo "2f5285ef563dca154aa247696dddef545d3d895dd9b227ed423ea0d43737c22c  %{SOURCE0}" | sha256sum -c -
unzip -q %{SOURCE0}

%build

%install
install -d %{buildroot}%{_libexecdir}/blackcod-electron
cp -a electron-v%{version}-linux-x64/. \
  %{buildroot}%{_libexecdir}/blackcod-electron/

%files
%license %{_libexecdir}/blackcod-electron/LICENSE
%license %{_libexecdir}/blackcod-electron/LICENSES.chromium.html
%{_libexecdir}/blackcod-electron/

%changelog
* Tue Nov 03 2026 VCHS Studios <vchs@example.invalid> - 39.2.7-1
- Package the pinned Electron runtime for BlackCod.
