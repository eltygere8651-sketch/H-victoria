import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtener directorio actual en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lista de archivos y carpetas obsoletas en la raíz (ya que existen en /src)
const itemsToRemove = [
  'index.tsx',
  'App.tsx',
  'index.css',
  'types.ts',
  'firebaseConfig.ts',
  'firebaseCredentials.ts',
  'sw.js',
  'metadata.json',
  'pages',       // Carpeta duplicada
  'components',  // Carpeta duplicada
  'services',    // Carpeta duplicada
  'utils'        // Carpeta duplicada
];

console.log('🧹 Iniciando limpieza del proyecto...');

let deletedCount = 0;

itemsToRemove.forEach(item => {
  const itemPath = path.join(__dirname, item);
  
  if (fs.existsSync(itemPath)) {
    try {
      // Borrado recursivo y forzado
      fs.rmSync(itemPath, { recursive: true, force: true });
      console.log(`✅ Eliminado: ${item}`);
      deletedCount++;
    } catch (error) {
      console.error(`❌ Error al eliminar ${item}:`, error.message);
    }
  } else {
    // Silencioso si ya no existe para no ensuciar la consola
  }
});

if (deletedCount > 0) {
  console.log(`\n✨ Limpieza completada. Se eliminaron ${deletedCount} elementos obsoletos.`);
} else {
  console.log('\n✨ El proyecto ya está limpio.');
}
console.log('🚀 El código fuente activo reside en la carpeta /src');
