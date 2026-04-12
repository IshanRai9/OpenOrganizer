const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  selectDirectories: () => ipcRenderer.invoke('select-directories'),
  getSubfolders: (dirPath) => ipcRenderer.invoke('get-subfolders', dirPath),
  loadConfig: () => ipcRenderer.invoke('load-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  loadPresets: () => ipcRenderer.invoke('load-presets'),
  savePresets: (presets) => ipcRenderer.invoke('save-presets', presets),
  organizeFiles: (config) => ipcRenderer.invoke('organize-files', config)
});
