# VibeShype Pulse

A desktop application built with Electron, React, and Vite.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)

## Installation

```bash
npm install
```

> If the Electron binary download times out, set a mirror and retry:
>
> ```bash
> set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
> npm install
> ```

## Running the App

```bash
npm run electron:dev
```

This starts the Vite dev server and launches the Electron window.

## Build for Production

```bash
npm run electron:build
```

The packaged output will be in the `dist-electron/` folder.

## Mobile (Capacitor)

Sync web assets to native projects:

```bash
npm run cap:sync
```

Open in Android Studio:

```bash
npm run cap:android
```

Open in Xcode:

```bash
npm run cap:ios
```
