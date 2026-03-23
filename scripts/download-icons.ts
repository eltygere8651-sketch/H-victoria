import fs from 'fs';
import https from 'https';

const download = (url: string, dest: string) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(true);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
};

async function run() {
  await download('https://placehold.co/192x192/dc2626/ffffff.png?text=V', 'public/icon-192.png');
  await download('https://placehold.co/512x512/dc2626/ffffff.png?text=V', 'public/icon-512.png');
  console.log('Done');
}
run();
