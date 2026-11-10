# README.md

<p align="center">
<img src="assets/logo.svg" alt="BlackCod Logo" width="120" />
</p>

<h1 align="center">BlackCod</h1>

<p align="center">
<strong>Your personal, offline video sanctuary.</strong><br />
A high-performance desktop application designed to organize, view, and manage your local media library with a YouTube-inspired experience.
</p>

<p align="center">
  <img alt="Version" src="https://img.shields.io/badge/version-1.1.5-blue.svg">
  <img alt="Maintained" src="https://img.shields.io/badge/Maintained%3F-yes-green.svg">
  <a href="LICENSE">
    <img alt="License" src="https://img.shields.io/badge/License-MIT-yellow.svg">
  </a>
</p>

---

## 📺 About The Project

**BlackCod** brings the familiar, sleek interface of modern streaming platforms to your local file system. Developed by **VCHS-Studios**, it solves the "cluttered folder" problem by providing a centralized, beautiful, and highly customizable environment to watch your saved videos without needing an internet connection.

### ✨ Key Features

* **Premium UI/UX:** A modern, responsive interface built with TailwindCSS and Lucide Icons for a smooth, intuitive experience.
* **Offline First:** No internet? No problem. All metadata and file references are stored locally via IndexedDB.
* **Advanced File Organization:** Upload individual files or entire folders. Organize your content into custom categories within the app without moving files on your hard drive.
* **Personalization:** Deep customization options to make the player and interface look exactly how you want.
* **Engagement Tracking:** Keep track of your journey with a built-in **History** log and a **Liked Videos** library.
* **Seamless Navigation:** Fast search and filtering to find your content instantly.
* **YouTube-style offline features:** Home recommendations, playlists, a playback queue, autoplay, smart chapters, transcript search, and local captions.
* **Explainable Smart Channels:** Build local channels from tags, folders, titles, ratings, languages, subtitles, and transcript content.
* **Optional local analysis:** Register external model-pack descriptors for future transcription, vision, and audio adapters. Models are not bundled and analysis never requires a network connection.
* **Versioned local data:** Configuration records are migrated into a versioned envelope so future releases can evolve storage safely.
* **Native scan boundary:** Electron exposes a typed, validated directory-scan IPC contract for the ongoing renderer-to-main indexing migration.

---

## 🛠️ Built With

BlackCod leverages a modern tech stack to ensure speed, type safety, and a small footprint.

* **Framework:** [Electron](https://www.electronjs.org/) (thin cross-platform desktop shell)
* **Language:** [TypeScript](https://www.typescriptlang.org/) & [React](https://reactjs.org/)
* **Styling:** [TailwindCSS](https://tailwindcss.com/)
* **Icons:** [Lucide React](https://lucide.dev/)
* **Database:** [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) (For persistent local storage)

---

## 🚀 Getting Started

### Prerequisites

* **Node.js** (v16.x or higher recommended)
* **npm** or **yarn**

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/17Arigato-jwd/blackcod.git
cd blackcod

```

2. **Install dependencies**

```bash
npm install

```

3. **Run the application (Development)**

```bash
npm run dev

```

4. **Run checks and build for Production**

```bash
npm run typecheck
npm run test
npm run build
npm run build:main
```

### Privacy and storage

BlackCod is designed for local-first use. Video files remain in their original locations. Library metadata, preferences, playlists, analysis jobs, model-pack descriptors, and cached records are stored in browser-managed local storage and IndexedDB. The Electron renderer uses a narrow preload bridge rather than direct Node.js access.

External model packs are opt-in metadata registrations. The current adapter boundary does not download or bundle models; a compatible local runtime must be supplied separately before inference can run. Analysis jobs expose cancellation and resource-budget fields so future providers can remain bounded.

### 📥 Multi-OS Downloads & Installation

BlackCod releases are automatically built and published across all major platforms using GitHub Actions on every version release. Download the appropriate package from the [GitHub Releases](https://github.com/17Arigato-jwd/BlackCod/releases) page:

* **Windows:**
  - Download the Squirrel installer: `BlackCod-<version> Setup.exe`.
  - Run the setup executable. BlackCod installs and creates shortcuts on the Desktop and Start Menu automatically.
* **macOS:**
  - Download the standalone archive: `BlackCod-darwin-x64-<version>.zip` (or arm64).
  - Extract the archive and drag `BlackCod.app` into `/Applications`.
* **Ubuntu / Debian:**
  - Download the Debian package: `blackcod_<version>_amd64.deb`.
  - Install via APT or dpkg:
    ```bash
    sudo apt install ./blackcod_<version>_amd64.deb
    ```
* **Fedora / Red Hat (Direct RPM):**
  - Download the RPM package: `blackcod-<version>.x86_64.rpm`.
  - Install via DNF:
    ```bash
    sudo dnf install ./blackcod-<version>.x86_64.rpm
    ```

---

### 📦 Fedora COPR Repository (Recommended for Fedora)

For Fedora users, BlackCod is available directly through the official
[17arigato-jwd/blackcod COPR repository](https://copr.fedorainfracloud.org/coprs/17arigato-jwd/blackcod/).

BlackCod on Fedora features a clean **dual-package architecture**:
* `blackcod`: Contains the core application assets, launcher script (`/usr/bin/blackcod`), `.desktop` entry, and app icons.
* `blackcod-electron`: Companion package providing the pinned Electron runtime (v39.2.7).

Both packages are hosted within the same Copr repository, allowing `dnf` to automatically resolve and install `blackcod-electron` as a dependency. **No third-party repositories are required.**

#### Install BlackCod on Fedora

Enable the Copr repository and install BlackCod:

```bash
sudo dnf copr enable 17arigato-jwd/blackcod
sudo dnf install blackcod
```

If `dnf copr` is not available on your system, install the COPR command plugin first:

```bash
sudo dnf install 'dnf-command(copr)'
```

Launch BlackCod from your application menu or run:

```bash
blackcod
```

The package installs the application launcher, desktop entry, icon, and runtime dependencies. Your media files stay on your machine; installing from COPR does not upload or synchronize your media library.

#### Update, remove, or disable the repository

Update BlackCod with your standard Fedora package updates:

```bash
sudo dnf upgrade blackcod
```

Remove only the application:

```bash
sudo dnf remove blackcod
```

Disable the BlackCod COPR repository:

```bash
sudo dnf copr disable 17arigato-jwd/blackcod
```

To inspect whether the repository is enabled:

```bash
dnf repolist | grep -i blackcod
```

#### COPR Maintainer Notes

The package is built from the Git repository using the Fedora spec in
[packaging/fedora](./packaging/fedora). Maintainers configure the SCM package with:

| Field | Value |
| --- | --- |
| Git repository | `https://github.com/17Arigato-jwd/BlackCod.git` |
| Branch/committish | `main` |
| Spec file | `packaging/fedora/blackcod.spec` |
| Build method | `rpkg` |

COPR builds the commit visible on the configured branch. Publish changes before rebuilding:

```bash
git add -A
git commit -m "Describe the change"
git push origin main
```

The build requires internet access because the spec runs `npm ci`. Detailed packaging notes and troubleshooting are in [packaging/fedora/README.md](./packaging/fedora/README.md).

The RPM declares `Requires: blackcod-electron`. Both packages are maintained within the same Copr repository, eliminating any dependency on external third-party repositories.

---

### 🤖 Automated GitHub Actions Releases

BlackCod leverages GitHub Actions (`.github/workflows/release.yml`) for automated multi-OS release builds triggered by tag pushes (`v*`) or manual `workflow_dispatch`. The release pipeline:
- Builds Squirrel `.exe` installers on `windows-latest`.
- Builds standalone application `.zip` archives on `macos-latest`.
- Builds `.deb` and `.rpm` Linux packages on `ubuntu-latest`.
- Packages all release artifacts via Electron Forge (`npm run make`) and automatically drafts a GitHub Release with downloadable binary assets.

---

## 📂 Project Structure

```text
BlackCod/
├── assets/             # Media, logo, and icons
├── LICENSE             # MIT License
├── components/         # Reusable React components
├── hooks/              # Custom React logic/hooks
├── input/              # Input handling or data entry logic
├── utils/              # Helper functions and utilities
├── App.tsx             # Main React application component
├── index.html          # Entry point for the web/renderer
├── index.tsx           # React DOM mounting script
├── main.ts             # Electron main process entry point
├── forge.config.cjs    # Electron Forge configuration
├── vite.config.ts      # Vite bundler configuration
├── types.ts            # TypeScript interfaces/types
└── metadata.json       # Project metadata and info

```

---

## 📝 Roadmap & Future Updates

* [x] Subtitle (SRT/VTT) parsing, sidecars, captions, and caption controls.
* [x] Custom playlists, playback queue, autoplay, and Home dashboard sections.
* [x] Picture-in-Picture mode and smart chapters.
* [x] Explainable Smart Channels and local analysis job scheduling.
* [ ] Add a concrete optional Whisper-compatible local inference runtime.
* [ ] Move long-running indexing fully into a native background service.
* [ ] Add broader packaging, performance, and end-to-end coverage.
* [ ] Add migrations for IndexedDB analysis, playlist, and library records.

---

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create.

1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.

---

<p align="center">
Created with ❤️ by <strong>17Arigato-jwd</strong> @ <strong>VCHS-Studios</strong>
</p>

---
