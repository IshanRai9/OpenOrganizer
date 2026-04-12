const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const fsPromises = fs.promises;
console.log("Electron script starting...");

function createWindow() {
  console.log("createWindow called!");
  const envNodeEnv = (process.env.NODE_ENV || '').trim();
  const isDev = envNodeEnv === 'development' || process.argv.includes('--dev') || !require('fs').existsSync(path.join(__dirname, '../dist/index.html'));
  console.log("isDev:", isDev, "NODE_ENV:", envNodeEnv);
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    title: 'OpenOrganizer',
    titleBarStyle: 'hidden', // Give it a modern hidden title bar look
    titleBarOverlay: {
      color: '#121212',
      symbolColor: '#ffffff',
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  console.log("App is ready! Creating window...");
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ICP EVENT: SELECT DIRECTORY
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });
  if (result.canceled) {
    return null;
  }
  return result.filePaths[0];
});

// IPC EVENT: SELECT MULTIPLE DIRECTORIES
ipcMain.handle('select-directories', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'multiSelections'],
  });
  if (result.canceled) {
    return [];
  }
  return result.filePaths;
});

// IPC EVENT: GET SUBFOLDERS
ipcMain.handle('get-subfolders', async (event, dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) return [];
    const entries = await fsPromises.readdir(dirPath, { withFileTypes: true });
    return entries.filter(e => e.isDirectory()).map(e => e.name);
  } catch (err) {
    return [];
  }
});

const CONFIG_PATH = path.join(app.getPath('userData'), 'setup.json');
const PRESETS_PATH = path.join(app.getPath('userData'), 'presets.json');

ipcMain.handle('load-config', async () => {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = await fsPromises.readFile(CONFIG_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {}
  return null;
});

ipcMain.handle('save-config', async (event, config) => {
  try {
    await fsPromises.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
    return true;
  } catch (err) {
    return false;
  }
});

ipcMain.handle('load-presets', async () => {
  try {
    if (fs.existsSync(PRESETS_PATH)) {
      const data = await fsPromises.readFile(PRESETS_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {}
  return [];
});

ipcMain.handle('save-presets', async (event, presets) => {
  try {
    await fsPromises.writeFile(PRESETS_PATH, JSON.stringify(presets, null, 2));
    return true;
  } catch (err) {
    return false;
  }
});

// IPC EVENT: ORGANIZE FILES
ipcMain.handle('organize-files', async (event, config) => {
  const { sourceDirs = [], tabs, outputMode = 'single', outputBaseDir = '' } = config;
  
  // sourceDirs is now an array of objects: { path, includeSubfolders, excludeDirs }
  // Support both old string format and new object format
  const normalizedSourceDirs = sourceDirs.map(d => {
    if (typeof d === 'string') return { path: d, includeSubfolders: false, excludeDirs: [] };
    return { path: d.path, includeSubfolders: d.includeSubfolders || false, excludeDirs: d.excludeDirs || [] };
  });

  const validSourceDirs = normalizedSourceDirs.filter(d => fs.existsSync(d.path));
  if (validSourceDirs.length === 0) {
    return { success: false, error: 'No valid source directories found.' };
  }

  // Build extension map: ext => target folder path
  const extensionMap = {};
  const allTargetDirs = new Set();

  for (const tab of tabs) {
    if (!tab.name || tab.name.trim() === '' || tab.extensions.length === 0) continue;

    let targetFolderPath;
    if (outputMode === 'per-tab') {
      if (tab.outputDir) {
        targetFolderPath = path.join(tab.outputDir, tab.name);
      } else {
        targetFolderPath = path.join(validSourceDirs[0].path, tab.name);
      }
    } else {
      if (outputBaseDir) {
        targetFolderPath = path.join(outputBaseDir, tab.name);
      } else {
        targetFolderPath = path.join(validSourceDirs[0].path, tab.name);
      }
    }

    if (!fs.existsSync(targetFolderPath)) {
      try {
        fs.mkdirSync(targetFolderPath, { recursive: true });
      } catch (err) {
        return { success: false, error: `Failed to create folder ${tab.name}: ${err.message}` };
      }
    }

    allTargetDirs.add(path.resolve(targetFolderPath));

    for (const ext of tab.extensions) {
      const normalizedExt = ext.startsWith('.') ? ext.toLowerCase() : '.' + ext.toLowerCase();
      extensionMap[normalizedExt] = targetFolderPath;
    }
  }

  let totalMoved = 0;
  const errors = [];

  // processDirectory now receives per-source-dir settings
  async function processDirectory(dirPath, includeSubfolders, excludeDirs) {
    const entries = await fsPromises.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
         const resolvedFull = path.resolve(fullPath);
         if (allTargetDirs.has(resolvedFull)) continue;

         const isExcluded = excludeDirs.some(ex => fullPath === ex || fullPath.startsWith(ex + path.sep));
         if (isExcluded) continue;
         
         if (includeSubfolders) {
            await processDirectory(fullPath, includeSubfolders, excludeDirs);
         }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        
        let targetDir = null;
        if (extensionMap[ext]) {
          targetDir = extensionMap[ext];
        } else if (extensionMap['*']) {
          targetDir = extensionMap['*'];
        }
        
        if (targetDir) {
          let newName = entry.name;
          let destPath = path.join(targetDir, newName);
          
          let counter = 1;
          while (fs.existsSync(destPath)) {
             const nameNoExt = path.basename(entry.name, ext);
             newName = `${nameNoExt} (${counter})${ext}`;
             destPath = path.join(targetDir, newName);
             counter++;
          }
          
          try {
             await fsPromises.rename(fullPath, destPath);
             totalMoved++;
          } catch (err) {
             try {
               await fsPromises.copyFile(fullPath, destPath);
               await fsPromises.unlink(fullPath);
               totalMoved++;
             } catch (copyErr) {
               errors.push(`Failed to move ${entry.name}: ${copyErr.message}`);
             }
          }
        }
      }
    }
  }

  try {
    // Process each source directory with its own subfolder/exclude settings
    for (const srcDir of validSourceDirs) {
      await processDirectory(srcDir.path, srcDir.includeSubfolders, srcDir.excludeDirs);
    }
    return { success: true, totalMoved, errors };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
