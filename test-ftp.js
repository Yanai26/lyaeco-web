require('dotenv').config();
const ftp = require('basic-ftp');
const { FTP_HOST, FTP_USER, FTP_PASSWORD, FTP_PORT } = process.env;

async function listDir(client, dirPath) {
  try {
    const items = await client.list(dirPath);
    if (items.length === 0) {
      console.log('  (vide)');
    } else {
      items.forEach(f => {
        const type = f.type === 2 ? '[DIR] ' : '[FILE]';
        console.log(`  ${type} ${f.name}`);
      });
    }
    return items;
  } catch (e) {
    console.log(`  ❌ Impossible de lister ${dirPath} : ${e.message}`);
    return [];
  }
}

async function explore() {
  const client = new ftp.Client();
  client.ftp.verbose = false;

  try {
    console.log('🔌 Connexion...');
    await client.access({
      host: FTP_HOST,
      user: FTP_USER,
      password: FTP_PASSWORD,
      port: Number(FTP_PORT) || 21,
      secure: false,
    });
    console.log('✅ Connecté.\n');

    // 1. PWD après login
    const pwd = await client.pwd();
    console.log(`📍 PWD après login : "${pwd}"\n`);

    // 2. Contenu de "/"
    console.log('📂 Contenu de "/" :');
    const rootItems = await listDir(client, '/');

    // 3. Contenu de "." (dossier actuel)
    console.log('\n📂 Contenu de "." (dossier actuel après login) :');
    await listDir(client, '.');

    // 4. Si "domains" existe, lister
    const hasDomains = rootItems.some(f => f.name === 'domains' && f.type === 2);
    if (hasDomains) {
      console.log('\n📂 Contenu de "/domains" :');
      const domainsItems = await listDir(client, '/domains');

      // Cherche lyaeco.com dans /domains
      const hasLyaeco = domainsItems.some(f => f.name === 'lyaeco.com' && f.type === 2);
      if (hasLyaeco) {
        console.log('\n📂 Contenu de "/domains/lyaeco.com" :');
        const lyaecoItems = await listDir(client, '/domains/lyaeco.com');

        // Cherche public_html dans lyaeco.com
        const hasPubHtml = lyaecoItems.some(f => f.name === 'public_html' && f.type === 2);
        if (hasPubHtml) {
          console.log('\n📂 Contenu de "/domains/lyaeco.com/public_html" :');
          await listDir(client, '/domains/lyaeco.com/public_html');
        }
      }
    }

    // 5. Cherche aussi public_html à la racine
    const hasPubHtmlRoot = rootItems.some(f => f.name === 'public_html' && f.type === 2);
    if (hasPubHtmlRoot) {
      console.log('\n📂 Contenu de "/public_html" :');
      await listDir(client, '/public_html');
    }

    console.log('\n✅ Exploration terminée.');

  } catch (e) {
    console.error('❌ Erreur :', e.message);
  } finally {
    client.close();
  }
}

explore();
