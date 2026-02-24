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
<img src="[https://img.shields.io/badge/version-1.1.2-blue.svg]" alt="Version 1.1.2" />
<img src="[https://img.shields.io/badge/Maintained%3F-yes-green.svg]" alt="Maintained" />
<a href="https://www.google.com/search?q=assets/LICENSE.txt">
<img src="[https://img.shields.io/badge/License-Custom-yellow.svg]" alt="Custom License" />
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

---

## 📸 Screenshots

<p align="center">
<em>Showcasing the BlackCod Interface</em>
</p>

| Installer | Home Dashboard |
| --- | --- |
| <img src="assets/Install.gif" width="400" alt="Installer GIF" /> | <img src="assets/dashboard_placeholder.png" width="400" alt="Dashboard" /> |
| Video Player | Customization Settings |
| --- | --- |
| <img src="assets/player_placeholder.png" width="400" alt="Video Player" /> | <img src="assets/settings_placeholder.png" width="400" alt="Settings" /> |

---

## 🛠️ Built With

BlackCod leverages a modern tech stack to ensure speed, type safety, and a small footprint.

* **Framework:** [Electron](https://www.electronjs.org/) (Cross-platform Desktop App)
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

4. **Build for Production**

```bash
npm run build

```

---

## 📂 Project Structure

```text
BlackCod/
├── assets/             # Media, logo, and LICENSE.txt
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

* [ ] Support for subtitle (SRT/VTT) uploading.
* [ ] Custom Playlist creation.
* [ ] Picture-in-Picture (PiP) mode.
* [ ] Video encoding/compression tools.

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

Distributed under a Custom License. See [LICENSE.txt](https://www.google.com/search?q=assets/LICENSE.txt) for more information.

---

<p align="center">
Created with ❤️ by <strong>17Arigato-jwd</strong> @ <strong>VCHS-Studios</strong>
</p>

---
