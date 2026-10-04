const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

const audioExtensions = new Set(['.wav', '.flac', '.mp3', '.ogg', '.oga', '.m4a', '.aac']);
const selectedAudio = new Map();
let mainWindow = null;
let projectOpen = false;
let closePromptPending = false;
let allowWindowClose = false;
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

ipcMain.handle('labello:open-label-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import phoneme labels',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Phoneme label files', extensions: ['lab', 'txt', 'textgrid'] }],
  });
  if (result.canceled) return [];
  return result.filePaths.map(filePath => registerAudioFile(filePath, path.basename(filePath)));
});

ipcMain.handle('labello:register-audio-file', async (_event, filePath, displayName) => {
  const resolvedPath = path.resolve(String(filePath));
  const extension = path.extname(resolvedPath).toLowerCase();
  if (!audioExtensions.has(extension)) throw new Error('The selected file is not a supported audio format.');
  const info = await fs.stat(resolvedPath);
  if (!info.isFile()) throw new Error('The selected audio path is not a file.');
  return registerAudioFile(resolvedPath, String(displayName || path.basename(resolvedPath)));
});

ipcMain.handle('labello:register-local-file', async (_event, filePath, displayName) => {
  const resolvedPath = path.resolve(String(filePath));
  const info = await fs.stat(resolvedPath);
  if (!info.isFile()) throw new Error('The selected path is not a file.');
  return registerAudioFile(resolvedPath, String(displayName || path.basename(resolvedPath)));
});

ipcMain.handle('labello:set-project-open', (_event, isOpen) => {
  projectOpen = Boolean(isOpen);
});

ipcMain.handle('labello:respond-to-close-request', (_event, shouldClose) => {
  closePromptPending = false;
  if (shouldClose) {
    projectOpen = false;
    allowWindowClose = true;
    mainWindow?.close();
  }
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

ipcMain.handle('labello:package-voicebank', async (_event, request) => {
  if (!request || typeof request !== 'object' || !Array.isArray(request.audioFiles) || request.audioFiles.length === 0) {
    throw new Error('Add at least one estimated recording with an available source file before packaging.');
  }
  if (typeof request.otoContent !== 'string' || !request.otoContent.trim()) {
    throw new Error('There are no OTO entries to package.');
  }
  const otoLines = request.otoContent.split(/\r?\n/).filter(line => line.trim() && !line.trimStart().startsWith('#'));
  if (otoLines.length !== request.audioFiles.length) {
    throw new Error('The OTO entries do not match the reviewed recordings selected for packaging.');
  }
  for (const [index, line] of otoLines.entries()) {
    const separator = line.indexOf('=');
    const fields = separator >= 0 ? line.slice(separator + 1).split(',') : [];
    if (
      separator <= 0 ||
      line.slice(0, separator) !== request.audioFiles[index]?.name ||
      fields.length !== 6 ||
      !fields[0].trim() ||
      /[\r\n]/.test(fields[0]) ||
      fields.slice(1).some(value => !Number.isFinite(Number(value)))
    ) {
      throw new Error(`OTO entry ${index + 1} is malformed. Correct the alias and timing fields before packaging.`);
    }
  }

  const parentResult = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose where to create the voicebank folder',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (parentResult.canceled || !parentResult.filePaths[0]) return null;

  const safeName = String(request.name || '')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/[. ]+$/g, '')
    .trim() || 'UTAU Voicebank';
  const parentPath = path.resolve(parentResult.filePaths[0]);
  const outputPath = path.join(parentPath, safeName);
  const temporaryPath = path.join(parentPath, `.labello-package-${crypto.randomUUID()}`);
  const seenNames = new Set();

  try {
    try {
      await fs.access(outputPath);
      throw new Error(`A folder named "${safeName}" already exists in the selected location. Choose another location or rename the character.`);
    } catch (error) {
      if (error && error.code !== 'ENOENT') throw error;
    }

    await fs.mkdir(temporaryPath);
    const voicePath = path.join(temporaryPath, 'voice');
    await fs.mkdir(voicePath);

    for (const audio of request.audioFiles) {
      if (!audio || typeof audio.name !== 'string' || typeof audio.token !== 'string') {
        throw new Error('A voicebank recording has invalid file information.');
      }
      const normalizedName = audio.name.replace(/[\\/]/g, path.sep);
      const parts = normalizedName.split(path.sep);
      if (path.isAbsolute(normalizedName) || parts.some(part => !part || part === '.' || part === '..' || /[:=\u0000-\u001f]/.test(part))) {
        throw new Error(`Unsafe voicebank recording path: "${audio.name}".`);
      }
      const audioPath = selectedAudio.get(audio.token);
      if (!audioPath) throw new Error(`The source audio for "${audio.name}" is unavailable. Re-import it before packaging.`);
      const relativeName = parts.join(path.sep);
      if (path.extname(relativeName).toLowerCase() !== '.wav' || path.extname(audioPath).toLowerCase() !== '.wav') {
        throw new Error(`UTAU voicebank packaging requires WAV recordings; "${audio.name}" is not a WAV file.`);
      }

      const collisionKey = relativeName.toLocaleLowerCase('en-US');
      if (seenNames.has(collisionKey)) throw new Error(`Two recordings use the same voicebank path: "${audio.name}".`);
      seenNames.add(collisionKey);

      const destination = path.resolve(voicePath, relativeName);
      const relativeDestination = path.relative(voicePath, destination);
      if (relativeDestination.startsWith(`..${path.sep}`) || relativeDestination === '..' || path.isAbsolute(relativeDestination)) {
        throw new Error(`Recording path escapes the voice folder: "${audio.name}".`);
      }
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.copyFile(audioPath, destination);
    }

    const imageExtension = request.imageToken ? path.extname(String(request.imageName || '')).toLowerCase() : '';
    const allowedImageExtensions = new Set(['.png', '.jpg', '.jpeg', '.bmp', '.gif', '.webp']);
    let imageLine = '';
    if (request.imageToken) {
      if (!allowedImageExtensions.has(imageExtension)) throw new Error('The character portrait must be PNG, JPEG, BMP, GIF, or WebP.');
      const imagePath = selectedAudio.get(request.imageToken);
      if (!imagePath) throw new Error('The selected character portrait is no longer available. Choose it again.');
      if (path.extname(imagePath).toLowerCase() !== imageExtension) throw new Error('The selected character portrait file type does not match its filename.');
      const imageFileName = `character${imageExtension}`;
      await fs.copyFile(imagePath, path.join(temporaryPath, imageFileName));
      imageLine = `image=${imageFileName}\r\n`;
    }

    const encodeShiftJis = text => require('iconv-lite').encode(text, 'shift_jis');
    const safeField = value => String(value || '').replace(/[\r\n]/g, ' ').trim();
    const characterText = [
      `name=${safeField(request.name)}`,
      imageLine.trimEnd(),
      `author=${safeField(request.author)}`,
      `version=${safeField(request.version)}`,
    ].filter(Boolean).join('\r\n') + '\r\n';
    await fs.writeFile(path.join(temporaryPath, 'character.txt'), encodeShiftJis(characterText));

    const readme = typeof request.readme === 'string' && request.readme.trim()
      ? request.readme
      : `${safeField(request.name)} voicebank\r\n\r\nRecording format: Japanese ${safeField(request.profile || 'CV / CVVC / VCV')}\r\n\r\nCredits and usage notes:\r\n`;
    await fs.writeFile(path.join(temporaryPath, 'README.txt'), Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(readme, 'utf8')]));

    let otoBytes;
    if (request.encoding === 'Shift-JIS') {
      otoBytes = encodeShiftJis(request.otoContent);
    } else if (request.encoding === 'UTF-8-BOM') {
      otoBytes = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(request.otoContent, 'utf8')]);
    } else if (request.encoding === 'UTF-8') {
      otoBytes = Buffer.from(request.otoContent, 'utf8');
    } else {
      throw new Error('Choose a supported oto.ini text encoding before packaging.');
    }
    await fs.writeFile(path.join(voicePath, 'oto.ini'), otoBytes);
    await fs.rename(temporaryPath, outputPath);
    shell.showItemInFolder(outputPath);
    return { folderPath: outputPath };
  } catch (error) {
    await fs.rm(temporaryPath, { recursive: true, force: true });
    throw error;
  }
});

ipcMain.handle('labello:save-project', async (_event, project, assets) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Labello project',
    defaultPath: `${project.name || 'Labello Project'}.labello`,
    filters: [{ name: 'Labello Project', extensions: ['labello'] }],
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
    filters: [{ name: 'Labello Projects', extensions: ['labello', 'vbp', 'json'] }],
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
    backgroundColor: '#0d1117',
    icon: path.join(__dirname, 'labello.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  });
  mainWindow.on('close', event => {
    if (allowWindowClose || !projectOpen) return;
    event.preventDefault();
    if (closePromptPending) return;
    closePromptPending = true;
    mainWindow.webContents.send('labello:request-close');
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
