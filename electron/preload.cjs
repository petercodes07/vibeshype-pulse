const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('pulse', {
  platform: process.platform,
  onNotification: (cb) => ipcRenderer.on('pulse:notification', (_e, data) => cb(data)),
})
