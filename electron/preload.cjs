const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('labelloDesktop', {
  openAudioFiles: () => ipcRenderer.invoke('labello:open-audio-files'),
  openAudioFolder: () => ipcRenderer.invoke('labello:open-audio-folder'),
  registerAudioFile: file => ipcRenderer.invoke('labello:register-audio-file', webUtils.getPathForFile(file), file.name),
  readAudioFile: token => ipcRenderer.invoke('labello:read-audio-file', token),
  getHardwareInfo: () => ipcRenderer.invoke('labello:hardware-info'),
  saveExport: (fileName, contents, encoding) => ipcRenderer.invoke('labello:save-export', fileName, contents, encoding),
  saveProject: (project, assets) => ipcRenderer.invoke('labello:save-project', project, assets),
  openProject: () => ipcRenderer.invoke('labello:open-project'),
});
