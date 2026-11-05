import { rm, mkdir, cp, readdir } from 'node:fs/promises';
// Se mantiene el directorio raíz para que el servidor de vista previa siga apuntando a él.
await mkdir('dist', { recursive: true });
for (const path of await readdir('dist')) await rm(`dist/${path}`, { recursive: true, force: true });
for (const path of ['index.html', 'styles.css', 'src']) await cp(path, `dist/${path}`, { recursive: true });
console.log('ELCAD: archivos estáticos preparados en dist/');
