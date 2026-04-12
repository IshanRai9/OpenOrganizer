<p align="center">
  <img src="./public/logo.png" width="200" alt="OpenOrganizer Logo">
</p>

# 📂 OpenOrganizer

**OpenOrganizer** is a powerful, desktop-first file management application designed to automate the clutter-to-order workflow. Built with **Electron**, **React**, and **Vite**, it provides a sleek, glassmorphic interface to sort your files into logical folder structures based on smart presets and custom extension rules.

## ✨ Features

- **🚀 Smart Presets**: One-click configuration for standard organization (Images, Docs, Videos, etc.).
- **📂 Multi-Source Support**: Add multiple directories to scan and organize simultaneously.
- **🔍 Deep Scanning**: Toggle subfolder scanning to pull files from nested structures.
- **🎯 Precise Control**: Define custom exclusion lists to keep specific folders untouched.
- **📍 Flexible Output**: Mode-based output control—organize into a single directory or per-tab locations.
- **🎨 Glassmorphic UI**: A modern, premium interface with smooth animations and intuitive layout.
- **💾 Auto-Save**: Your configuration and custom presets are automatically saved locally.

## 🛠️ Tech Stack

- **Framework**: [Electron](https://www.electronjs.org/)
- **UI Architecture**: [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Styling**: Modern CSS with Glassmorphism and CSS Variables.
- **Process Communication**: Electron IPC for secure file system access.

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/IshanRai9/OpenOrganizer.git
    cd OpenOrganizer
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

### Development

Run the application in development mode with HMR:
```bash
npm run dev
```

### Building for Production

Create a production-ready installer (Windows):
```bash
npm run build
```
The output will be located in the `dist-electron/` directory.

## 📝 Roadmap & TODO

- [ ] **Home Page Default**: Make the landing page cleaner before a preset is chosen.
- [ ] **Cloud Presets**: Sync your organization rules across devices.
- [ ] **File Preview**: Quick preview of files before moving.
- [ ] **Log View**: Detailed history of moved files.

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---
Built with ❤️ by [Ishan Rai](https://github.com/IshanRai9)
