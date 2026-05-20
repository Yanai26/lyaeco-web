require('dotenv').config();
const ftp = require('basic-ftp');
const path = require('path');
const fs = require('fs');

const { FTP_HOST, FTP_USER, FTP_PASSWORD, FTP_PORT, FTP_REMOTE_DIR } = process.env;

if (!FTP_PASSWORD) {
  console.error('❌ Erreur : FTP_PASSWORD est vide dans le fichier .env');
  process.exit(1);
}

if (!FTP_REMOTE_DIR) {
  console.error('❌ Erreur : FTP_REMOTE_DIR est vide dans le fichier .env');
  process.exit(1);
}

const HTML_FILES = fs.readdirSync(__dirname).filter(f =>
  f.endsWith('.html') && f !== 'index-old.html'
);

async function deploy() {
  const client = new ftp.Client();
  client.ftp.verbose = false;

  let htmlCount = 0;
  let imgCount = 0;
  let extraCount = 0;

  try {
    console.log('🔌 Connexion au serveur FTP Hostinger...');
    await client.access({
      host: FTP_HOST,
      user: FTP_USER,
      password: FTP_PASSWORD,
      port: Number(FTP_PORT) || 21,
      secure: false,
    });
    console.log('✅ Connexion établie.');

    // --- Positionner dans le bon dossier ---
    console.log(`\n📂 cd ${FTP_REMOTE_DIR}...`);
    await client.cd(FTP_REMOTE_DIR);

    // --- Upload des fichiers HTML ---
    console.log(`\n📄 Upload des fichiers HTML vers ${FTP_REMOTE_DIR}/...`);
    for (const file of HTML_FILES) {
      const localPath = path.join(__dirname, file);
      console.log(`   ⬆️  ${file} → ${FTP_REMOTE_DIR}/${file}`);
      await client.uploadFrom(localPath, file);
      htmlCount++;
    }

    // --- Upload .htaccess (fichier caché) ---
    console.log(`\n⚙️  Upload .htaccess → ${FTP_REMOTE_DIR}/.htaccess...`);
    await client.uploadFrom(path.join(__dirname, '.htaccess'), '.htaccess');
    extraCount++;

    // --- Upload favicon.ico ---
    console.log(`\n🖼️  Upload favicon.ico → ${FTP_REMOTE_DIR}/favicon.ico...`);
    await client.uploadFrom(path.join(__dirname, 'favicon.ico'), 'favicon.ico');
    extraCount++;

    // --- Upload send-mail.php ---
    console.log(`\n📧 Upload send-mail.php → ${FTP_REMOTE_DIR}/send-mail.php...`);
    await client.uploadFrom(path.join(__dirname, 'send-mail.php'), 'send-mail.php');
    extraCount++;

    // --- Upload chat-api.php ---
    console.log(`\n🤖 Upload chat-api.php → ${FTP_REMOTE_DIR}/chat-api.php...`);
    await client.uploadFrom(path.join(__dirname, 'chat-api.php'), 'chat-api.php');
    extraCount++;

    // --- Upload logs/.htaccess ---
    console.log(`\n🔒 Upload logs/.htaccess → ${FTP_REMOTE_DIR}/logs/.htaccess...`);
    await client.ensureDir(`${FTP_REMOTE_DIR}/logs`);
    await client.cd(`${FTP_REMOTE_DIR}/logs`);
    await client.uploadFrom(path.join(__dirname, 'logs', '.htaccess'), '.htaccess');
    await client.cd(FTP_REMOTE_DIR);
    extraCount++;

    // --- Upload data/tarifs.json ---
    console.log(`\n📊 Upload data/tarifs.json → ${FTP_REMOTE_DIR}/data/tarifs.json...`);
    await client.ensureDir(`${FTP_REMOTE_DIR}/data`);
    await client.cd(`${FTP_REMOTE_DIR}/data`);
    await client.uploadFrom(path.join(__dirname, 'data', 'tarifs.json'), 'tarifs.json');
    await client.cd(FTP_REMOTE_DIR);
    extraCount++;

    // --- Upload lib/phpmailer/ ---
    console.log(`\n📚 Upload lib/phpmailer/ → ${FTP_REMOTE_DIR}/lib/phpmailer/...`);
    await client.ensureDir(`${FTP_REMOTE_DIR}/lib`);
    await client.ensureDir(`${FTP_REMOTE_DIR}/lib/phpmailer`);
    await client.cd(`${FTP_REMOTE_DIR}/lib/phpmailer`);
    const phpmailerDir = path.join(__dirname, 'lib', 'phpmailer');
    const phpmailerFiles = fs.readdirSync(phpmailerDir).filter(f => fs.statSync(path.join(phpmailerDir, f)).isFile());
    for (const file of phpmailerFiles) {
      console.log(`   ⬆️  ${file}`);
      await client.uploadFrom(path.join(phpmailerDir, file), file);
      extraCount++;
    }
    console.log(`\n🔒 Upload lib/.htaccess → ${FTP_REMOTE_DIR}/lib/.htaccess...`);
    await client.cd(`${FTP_REMOTE_DIR}/lib`);
    await client.uploadFrom(path.join(__dirname, 'lib', '.htaccess'), '.htaccess');
    extraCount++;
    await client.cd(FTP_REMOTE_DIR);

    // --- Upload css/ ---
    console.log(`\n🎨 Upload css/ → ${FTP_REMOTE_DIR}/css/...`);
    await client.ensureDir(`${FTP_REMOTE_DIR}/css`);
    await client.cd(`${FTP_REMOTE_DIR}/css`);
    const cssDir = path.join(__dirname, 'css');
    const cssFiles = fs.readdirSync(cssDir).filter(f => fs.statSync(path.join(cssDir, f)).isFile());
    for (const file of cssFiles) {
      console.log(`   ⬆️  ${file}`);
      await client.uploadFrom(path.join(cssDir, file), file);
      extraCount++;
    }
    await client.cd(FTP_REMOTE_DIR);

    // --- Upload js/ ---
    console.log(`\n📦 Upload js/ → ${FTP_REMOTE_DIR}/js/...`);
    await client.ensureDir(`${FTP_REMOTE_DIR}/js`);
    await client.cd(`${FTP_REMOTE_DIR}/js`);
    const jsDir = path.join(__dirname, 'js');
    const jsFiles = fs.readdirSync(jsDir).filter(f => fs.statSync(path.join(jsDir, f)).isFile());
    for (const file of jsFiles) {
      console.log(`   ⬆️  ${file}`);
      await client.uploadFrom(path.join(jsDir, file), file);
      extraCount++;
    }
    await client.cd(FTP_REMOTE_DIR);

    // --- Upload des images (récursif) ---
    console.log(`\n🖼️  Upload récursif de images/ → ${FTP_REMOTE_DIR}/images/...`);
    await client.cd(FTP_REMOTE_DIR);
    const imagesDir = path.join(__dirname, 'images');

    async function uploadImagesRecursive(localDir, remoteDir) {
      await client.ensureDir(remoteDir);
      await client.cd(remoteDir);
      const entries = fs.readdirSync(localDir);
      for (const entry of entries) {
        const localPath = path.join(localDir, entry);
        if (fs.statSync(localPath).isDirectory()) {
          await uploadImagesRecursive(localPath, `${remoteDir}/${entry}`);
          await client.cd(remoteDir);
        } else {
          const rel = localPath.replace(__dirname + path.sep, '').replace(/\\/g, '/');
          console.log(`   ⬆️  ${rel} → ${remoteDir}/${entry}`);
          await client.uploadFrom(localPath, entry);
          imgCount++;
        }
      }
    }

    await uploadImagesRecursive(imagesDir, `${FTP_REMOTE_DIR}/images`);

    // --- Récap ---
    console.log('');
    console.log('🎉 Déploiement réussi !');
    console.log(`   ✅ ${htmlCount} fichier(s) HTML uploadé(s) dans ${FTP_REMOTE_DIR}/`);
    console.log(`   ✅ ${imgCount} image(s) uploadée(s) dans ${FTP_REMOTE_DIR}/images/`);
    console.log(`   ✅ ${extraCount} fichier(s) de config uploadé(s) (.htaccess, send-mail.php)`);
    console.log('   🌐 Ton site est en ligne sur lyaeco.com');

  } catch (err) {
    console.error('');
    console.error('❌ Échec du déploiement :', err.message);
    process.exit(1);
  } finally {
    client.close();
  }
}

deploy();
