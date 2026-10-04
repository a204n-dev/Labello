const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

const audioExtensions = new Set(['.wav', '.flac', '.mp3', '.ogg', '.oga', '.m4a', '.aac']);
const selectedAudio = new Map();
let mainWindow = null;
const releasesUrl = 'https://github.com/a204n-dev/Labello/releases/latest';
const updatePreferencesPath = () => path.join(app.getPath('userData'), 'update-preferences.json');

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;

function canUseAutoUpdater() {
  return app.isPackaged && process.platform === 'win32' && !process.env.PORTABLE_EXECUTABLE_DIR;
}

function sendUpdateStatus(status) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('labello:update-status', status);
  }
}

function reportUpdateError(error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error('Labello update operation failed:', message);
  sendUpdateStatus({ status: 'error', message });
}

autoUpdater.on('checking-for-update', () => sendUpdateStatus({ status: 'checking' }));
autoUpdater.on('update-available', info => sendUpdateStatus({ status: 'available', version: info.version }));
autoUpdater.on('update-not-available', () => sendUpdateStatus({ status: 'not-available' }));
autoUpdater.on('download-progress', progress => sendUpdateStatus({
  status: 'downloading',
  percent: Math.round(progress.percent),
}));
autoUpdater.on('update-downloaded', info => sendUpdateStatus({ status: 'downloaded', version: info.version }));
autoUpdater.on('error', reportUpdateError);

ipcMain.handle('labello:update-check', async () => {
  if (!canUseAutoUpdater()) {
    sendUpdateStatus({ status: 'manual' });
    return;
  }
  try {
    await autoUpdater.checkForUpdates();
  } catch (error) {
    reportUpdateError(error);
  }
});

ipcMain.handle('labello:update-download', async () => {
  if (!canUseAutoUpdater()) throw new Error('In-app updates are available only in the installed Windows build.');
  try {
    await autoUpdater.downloadUpdate();
  } catch (error) {
    reportUpdateError(error);
  }
});

ipcMain.handle('labello:update-install', () => {
  if (!canUseAutoUpdater()) throw new Error('This build must be updated by downloading the latest release.');
  autoUpdater.quitAndInstall();
});

ipcMain.handle('labello:update-open-releases', () => shell.openExternal(releasesUrl));

ipcMain.handle('labello:update-get-deferred-version', async () => {
  try {
    const preferences = JSON.parse(await fs.readFile(updatePreferencesPath(), 'utf8'));
    if (preferences && (preferences.deferredVersion === null || typeof preferences.deferredVersion === 'string')) {
      return preferences.deferredVersion;
    }
    throw new Error('The saved update preference has an invalid format.');
  } catch (error) {
    if (error && error.code === 'ENOENT') return null;
    console.error('Could not read the saved update preference:', error);
    throw error;
  }
});

ipcMain.handle('labello:update-defer', async (_event, version) => {
  if (typeof version !== 'string' || version.trim() === '') {
    throw new Error('A valid update version is required to defer this update.');
  }
  try {
    await fs.mkdir(app.getPath('userData'), { recursive: true });
    await fs.writeFile(updatePreferencesPath(), JSON.stringify({ deferredVersion: version }), 'utf8');
  } catch (error) {
    console.error('Could not save the deferred update preference:', error);
    throw error;
  }
});

function registerAudioFile(filePath, displayName) {
  const token = crypto.randomUUID();
  selectedAudio.set(token, filePath);
  return { token, name: displayName };
}

async function walkAudioFiles(directory, root = directory, files = []) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await walkAudioFiles(entryPath, root, files);
    } else if (entry.isFile() && audioExtensions.has(path.extname(entry.name).toLowerCase())) {
      files.push(registerAudioFile(entryPath, path.relative(root, entryPath)));
    }
  }
  return files;
}

function projectAssetsDirectory(projectPath) {
  return `${projectPath}.assets`;
}

ipcMain.handle('labello:open-audio-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Add audio files',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Audio', extensions: [...audioExtensions].map(ext => ext.slice(1)) }],
  });
  if (result.canceled) return [];
  return result.filePaths.map(filePath => registerAudioFile(filePath, path.basename(filePath)));
});

ipcMain.handle('labello:open-audio-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open audio dataset folder',
    properties: ['openDirectory'],
  });
  if (result.canceled || !result.filePaths[0]) return [];
  return walkAudioFiles(result.filePaths[0]);
});

ipcMain.handle('labello:register-audio-file', async (_event, filePath, displayName) => {
  const resolvedPath = path.resolve(String(filePath));
  const extension = path.extname(resolvedPath).toLowerCase();
  if (!audioExtensions.has(extension)) throw new Error('The selected file is not a supported audio format.');
  const info = await fs.stat(resolvedPath);
  if (!info.isFile()) throw new Error('The selected audio path is not a file.');
  return registerAudioFile(resolvedPath, String(displayName || path.basename(resolvedPath)));
});

ipcMain.handle('labello:read-audio-file', async (_event, token) => {
  const filePath = selectedAudio.get(token);
  if (!filePath) throw new Error('This audio file is no longer available. Reopen it from disk.');
  return new Uint8Array(await fs.readFile(filePath));
});

ipcMain.handle('labello:hardware-info', () => {
  const cpus = os.cpus();
  const platform = os.platform();
  return {
    platform,
    arch: os.arch(),
    cpuModel: cpus[0]?.model || 'Unknown CPU',
    cpuCores: cpus.length,
    totalMemoryGb: (os.totalmem() / 1024 ** 3).toFixed(1),
    freeMemoryGb: (os.freemem() / 1024 ** 3).toFixed(1),
    recommendedWorkers: Math.max(1, Math.min(8, Math.floor(cpus.length / 2) || 1)),
    hasGpuHint: false,
    windowsCompatible: platform === 'win32',
  };
});

ipcMain.handle('labello:save-export', async (_event, fileName, contents, encoding) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export labels',
    defaultPath: path.basename(String(fileName || 'labels.txt')),
  });
  if (result.canceled || !result.filePath) return null;

  const text = String(contents);
  let output;
  if (encoding === 'Shift-JIS') {
    output = require('iconv-lite').encode(text, 'shift_jis');
  } else if (encoding === 'UTF-8-BOM') {
    output = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(text, 'utf8')]);
  } else {
    output = Buffer.from(text, 'utf8');
  }
  await fs.writeFile(result.filePath, output);
  return { filePath: result.filePath };
});

ipcMain.handle('labello:save-project', async (_event, project, assets) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Labello project',
    defaultPath: `${project.name || 'Labello Project'}.vbp`,
    filters: [{ name: 'Labello Project', extensions: ['vbp'] }],
  });
  if (result.canceled || !result.filePath) return null;

  const assetsDirectory = projectAssetsDirectory(result.filePath);
  await fs.mkdir(assetsDirectory, { recursive: true });
  const assetById = new Map((assets || []).map(asset => [asset.id, asset]));
  const savedFiles = [];
  const missingAudio = [];

  for (const file of project.files || []) {
    const asset = assetById.get(file.id);
    if (!asset || !asset.token) {
      if (file.audioBuffer || file.durationMs > 0) missingAudio.push(file.name);
      savedFiles.push({ ...file, audioPath: null });
      continue;
    }
    const sourcePath = selectedAudio.get(asset.token);
    if (!sourcePath) throw new Error(`Cannot save audio for "${file.name}": its source file is unavailable.`);

    const safeId = String(file.id).replace(/[^a-zA-Z0-9_-]/g, '_');
    const assetName = `${safeId}-${path.basename(file.name)}`;
    await fs.copyFile(sourcePath, path.join(assetsDirectory, assetName));
    savedFiles.push({
      ...file,
      audioPath: `${path.basename(result.filePath)}.assets/${assetName}`,
    });
  }

  const savedProject = { ...project, files: savedFiles };
  await fs.writeFile(result.filePath, JSON.stringify(savedProject, null, 2), 'utf8');
  return { filePath: result.filePath, missingAudio };
});

ipcMain.handle('labello:open-project', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open Labello project',
    properties: ['openFile'],
    filters: [{ name: 'Labello Project', extensions: ['vbp', 'json'] }],
  });
  if (result.canceled || !result.filePaths[0]) return null;

  const projectPath = result.filePaths[0];
  const project = JSON.parse(await fs.readFile(projectPath, 'utf8'));
  if (!project || !Array.isArray(project.files)) {
    throw new Error('The selected file is not a valid Labello project.');
  }

  const expectedAssetsDirectory = path.basename(projectPath) + '.assets';
  const assetsDirectory = projectAssetsDirectory(projectPath);
  const audioTokens = {};
  const missingAudio = [];

  for (const file of project.files) {
    if (!file.audioPath) continue;
    const relativePath = String(file.audioPath).replace(/\\/g, '/');
    const [assetDirectory, assetName, ...extraParts] = relativePath.split('/');
    if (assetDirectory !== expectedAssetsDirectory || !assetName || extraParts.length > 0 || path.basename(assetName) !== assetName) {
      missingAudio.push(file.name);
      continue;
    }
    const audioPath = path.join(assetsDirectory, assetName);
    try {
      await fs.access(audioPath);
      audioTokens[file.id] = registerAudioFile(audioPath, file.name);
    } catch {
      missingAudio.push(file.name);
    }
  }

  return { project, audioTokens, missingAudio };
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1080,
    minHeight: 720,
    title: 'Labello — Vocal Dataset Workstation',
    backgroundColor: '#020617',
    icon: path.join(__dirname, 'labello.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });

  const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
  const pageLoad = app.commandLine.hasSwitch('dev')
    ? mainWindow.loadURL('http://localhost:5173')
    : mainWindow.loadFile(indexPath);
  pageLoad.catch(err => {
    console.error('Failed to load application index:', err);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  mainWindow.webContents.once('did-finish-load', () => {
    if (canUseAutoUpdater()) {
      autoUpdater.checkForUpdates().catch(reportUpdateError);
    }
  });
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
