Name:           blackcod
Version:        1.1.5
Release:        1%{?dist}
Summary:        Offline-first local video library
License:        MIT
URL:            https://github.com/17Arigato-jwd/BlackCod
Source0:        https://github.com/17Arigato-jwd/BlackCod/archive/refs/heads/main.tar.gz
%global debug_package %{nil}

BuildRequires:  nodejs
BuildRequires:  npm
BuildRequires:  desktop-file-utils
BuildRequires:  hicolor-icon-theme
Requires:       blackcod-electron

%description
BlackCod is a privacy-first desktop video library for organizing and watching
local media with an offline YouTube-style interface.

%prep
%autosetup -n BlackCod-main

%build
npm ci --ignore-scripts --include=dev
npm run typecheck
npm run test
npm run build
npm run build:main
npm prune --omit=dev

%install
install -d %{buildroot}%{_libexecdir}/%{name}
install -d %{buildroot}%{_bindir}
install -d %{buildroot}%{_datadir}/applications
install -d %{buildroot}%{_datadir}/icons/hicolor/scalable/apps

cp -a dist node_modules package.json %{buildroot}%{_libexecdir}/%{name}/
cp -a assets %{buildroot}%{_libexecdir}/%{name}/

install -m 0755 packaging/fedora/blackcod %{buildroot}%{_bindir}/blackcod
install -m 0644 packaging/fedora/blackcod.desktop \
  %{buildroot}%{_datadir}/applications/blackcod.desktop
install -m 0644 assets/logo.svg \
  %{buildroot}%{_datadir}/icons/hicolor/scalable/apps/blackcod.svg

desktop-file-validate %{buildroot}%{_datadir}/applications/blackcod.desktop

%files
%license LICENSE
%doc README.md
%{_bindir}/blackcod
%{_libexecdir}/%{name}/
%{_datadir}/applications/blackcod.desktop
%{_datadir}/icons/hicolor/scalable/apps/blackcod.svg

%changelog
* Wed Nov 04 2026 VCHS Studios <vchs@example.invalid> - 1.1.5-1
- Bump version to 1.1.5 and switch to MIT License.

* Wed Nov 04 2026 VCHS Studios <vchs@example.invalid> - 1.1.4-2
- Require blackcod-electron and use pinned electron runtime path.

* Tue Nov 03 2026 VCHS Studios <vchs@example.invalid> - 1.1.4-1
- Initial Fedora COPR SCM package.
