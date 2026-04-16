import { app, BrowserWindow, Menu, Tray, nativeImage, shell } from 'electron';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import { startServer } from '../server/index';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Use Vite's HMR server only when electron-vite injects ELECTRON_RENDERER_URL.
// Otherwise (packaged app or plain `electron .` from built bundle), load the
// renderer bundle served by our own embedded Hono server.
const VITE_DEV_URL = process.env.ELECTRON_RENDERER_URL;
const isDev = !app.isPackaged && !!VITE_DEV_URL;

// Signal production mode to the server (hides debug info, disables CORS)
if (app.isPackaged) {
  process.env.STUDYPATH_PRODUCTION = '1';
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let serverPort = 0;

/* ─── DB path: per-user, in Electron's userData dir ───────────────── */

function setupDbPath(): string {
  const userData = app.getPath('userData');
  mkdirSync(userData, { recursive: true });
  const dbPath = join(userData, 'studypath.db');
  process.env.STUDYPATH_DB_PATH = dbPath;
  return dbPath;
}

/* ─── Embed the Hono server inside the main process ────────────────── */

async function startEmbeddedServer(): Promise<number> {
  // Random ephemeral port — let the OS pick one
  process.env.STUDYPATH_PORT = '0';
  return await startServer();
}

/* ─── Window ───────────────────────────────────────────────────────── */

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 720,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#1B1915',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Load: dev → Vite HMR; prod → Hono-served renderer
  if (isDev && VITE_DEV_URL) {
    await mainWindow.loadURL(VITE_DEV_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    await mainWindow.loadURL(`http://127.0.0.1:${serverPort}/`);
  }
}

/* ─── Native menu ──────────────────────────────────────────────────── */

function buildMenu() {
  const isMac = process.platform === 'darwin';

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const },
            ],
          },
        ]
      : []),
    {
      label: 'File',
      submenu: [isMac ? { role: 'close' } : { role: 'quit' }],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac
          ? ([
              { role: 'pasteAndMatchStyle' as const },
              { role: 'delete' as const },
              { role: 'selectAll' as const },
            ] satisfies Electron.MenuItemConstructorOptions[])
          : ([
              { role: 'delete' as const },
              { type: 'separator' as const },
              { role: 'selectAll' as const },
            ] satisfies Electron.MenuItemConstructorOptions[])),
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? ([
              { type: 'separator' as const },
              { role: 'front' as const },
              { type: 'separator' as const },
              { role: 'window' as const },
            ] satisfies Electron.MenuItemConstructorOptions[])
          : ([{ role: 'close' as const }] satisfies Electron.MenuItemConstructorOptions[])),
      ],
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Sobre o StudyPath',
          click: async () => {
            await shell.openExternal('https://github.com/');
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

/* ─── System tray ──────────────────────────────────────────────────── */

function buildTray() {
  // macOS expects a "template image" — pure black silhouette that the OS
  // tints automatically for light/dark menubar. Win/Linux take a colored PNG.
  const trayFile = process.platform === 'darwin' ? 'tray-icon.png' : 'tray-icon-color.png';
  const iconPath = isDev
    ? resolve(__dirname, '../../build', trayFile)
    : resolve(process.resourcesPath, trayFile);

  let image: Electron.NativeImage;
  try {
    image = nativeImage.createFromPath(iconPath);
    if (image.isEmpty()) {
      image = nativeImage.createEmpty();
    }
  } catch {
    image = nativeImage.createEmpty();
  }

  // Auto-recolor on macOS based on menubar theme.
  if (process.platform === 'darwin' && !image.isEmpty()) {
    image.setTemplateImage(true);
  }

  tray = new Tray(image);
  tray.setToolTip('StudyPath');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Abrir StudyPath',
      click: () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Sair',
      click: () => {
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(contextMenu);
}

/* ─── App lifecycle ────────────────────────────────────────────────── */

app.whenReady().then(async () => {
  setupDbPath();

  try {
    serverPort = await startEmbeddedServer();
    console.log(`[electron] embedded server on port ${serverPort}`);
  } catch (err) {
    console.error('[electron] failed to start embedded server', err);
  }

  buildMenu();
  await createWindow();
  buildTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// macOS: keep app running when window is closed; Win/Linux: quit.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Tray cleanup happens automatically.
});
