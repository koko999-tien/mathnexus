import { copyFile } from 'node:fs/promises';
import { build } from 'vite';

process.env.DEPLOY_TARGET = 'pages';
await build();
await copyFile('scripts/pages-404.html', 'dist/404.html');
