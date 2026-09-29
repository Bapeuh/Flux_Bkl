const { app, BrowserWindow, Menu, clipboard, dialog } = require('electron');
let instance;
app.whenReady().then(async () => {
  const { startServer } = await import('../server/server.mjs');
  instance = await startServer({ port: 0 });
  const win = new BrowserWindow({ width: 1440, height: 960, minWidth: 900, minHeight: 640, webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true } });
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'Fichier', submenu: [
      { label: 'Copier le lien réseau', click: () => {
        if (instance.lanUrls.length) clipboard.writeText(instance.lanUrls[0]);
        else dialog.showMessageBox(win, { message: 'Aucune adresse réseau IPv4 détectée.' });
      } },
      { type: 'separator' },
      { role: 'quit', label: 'Quitter' }
    ] },
    { label: 'Affichage', submenu: [{ role: 'reload' }, { role: 'togglefullscreen' }] }
  ]));
  await win.loadURL(instance.localUrl);
}).catch(error => { dialog.showErrorBox('Flux Backlight', error.message); app.quit(); });
app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => { if (instance) instance.server.close(); });
