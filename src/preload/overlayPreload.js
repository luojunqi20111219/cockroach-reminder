const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cockroachAPI', {
  onShow: (callback) => {
    ipcRenderer.on('show-cockroaches', (_, config) => callback(config));
  },
  onHide: (callback) => {
    ipcRenderer.on('hide-cockroaches', () => callback());
  },
  animationDone: () => {
    ipcRenderer.send('animation-done');
  },
  getFrameUrl: (index) => {
    return `cockroach://frames/001_1.1.${index}.png`;
  },
});
