const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('labelloDesktop', {
  openAudioFiles: () => ipcRenderer.invoke('labello:open-audio-files'),
  openAudioFolder: () => ipcRenderer.invoke('labello:open-audio-folder'),
  openLabelFiles: () => ipcRenderer.invoke('labello:open-label-files'),
  registerAudioFile: file => ipcRenderer.invoke('labello:register-audio-file', webUtils.getPathForFile(file), file.name),
  registerLocalFile: file => ipcRenderer.invoke('labello:register-local-file', webUtils.getPathForFile(file), file.name),
  readAudioFile: token => ipcRenderer.invoke('labello:read-audio-file', token),
  getHardwareInfo: () => ipcRenderer.invoke('labello:hardware-info'),
  saveExport: (fileName, contents, encoding) => ipcRenderer.invoke('labello:save-export', fileName, contents, encoding),
  saveProject: (project, assets) => ipcRenderer.invoke('labello:save-project', project, assets),
  openProject: () => ipcRenderer.invoke('labello:open-project'),
  packageVoicebank: request => ipcRenderer.invoke('labello:package-voicebank', request),
  setProjectOpen: isOpen => ipcRenderer.invoke('labello:set-project-open', isOpen),
  respondToCloseRequest: shouldClose => ipcRenderer.invoke('labello:respond-to-close-request', shouldClose),
  onCloseRequested: callback => {
    const listener = () => callback();
    ipcRenderer.on('labello:request-close', listener);
    return () => ipcRenderer.removeListener('labello:request-close', listener);
  },
  checkForUpdates: () => ipcRenderer.invoke('labello:update-check'),
  downloadUpdate: () => ipcRenderer.invoke('labello:update-download'),
  installUpdate: () => ipcRenderer.invoke('labello:update-install'),
  openReleasesPage: () => ipcRenderer.invoke('labello:update-open-releases'),
  getDeferredUpdateVersion: () => ipcRenderer.invoke('labello:update-get-deferred-version'),
  deferUpdate: version => ipcRenderer.invoke('labello:update-defer', version),
  onUpdateStatus: callback => {
    const listener = (_event, status) => callback(status);
    ipcRenderer.on('labello:update-status', listener);
    return () => ipcRenderer.removeListener('labello:update-status', listener);
  },
});
