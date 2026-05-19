# LYAECO Web

Site vitrine HTML/CSS/JS pour artisans et commerçants.  
Déploiement automatique sur Hostinger via FTP.

## Prérequis

- [Node.js](https://nodejs.org/) installé sur ta machine
- Un accès FTP Hostinger actif

## Installation

```bash
npm install
```

## Configuration

1. Copie le fichier `.env.example` en `.env` :

```bash
cp .env.example .env
```

2. Ouvre le fichier `.env` et remplis les valeurs :

```
FTP_HOST=145.223.122.221
FTP_USER=u983917693
FTP_PASSWORD=ton_mot_de_passe_hostinger
FTP_PORT=21
FTP_REMOTE_DIR=/public_html
```

> ⚠️ Ne partage jamais le fichier `.env`. Il est ignoré par Git.

## Déploiement

Lance cette commande pour uploader `index.html` sur ton serveur Hostinger :

```bash
npm run deploy
```

Le script va :
1. Lire tes identifiants depuis `.env`
2. Se connecter au FTP Hostinger
3. Uploader `index.html` vers `/public_html`
4. Afficher un message de succès ou d'erreur

## Structure du projet

```
lyaeco-web/
├── index.html        # Site web (fichier unique)
├── deploy.js         # Script de déploiement FTP
├── package.json      # Configuration npm
├── .env              # Identifiants FTP (privé, ignoré par Git)
├── .env.example      # Template public des variables d'environnement
├── .gitignore        # Fichiers ignorés par Git
└── README.md         # Ce fichier
```
