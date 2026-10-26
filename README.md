# Interter — le grand tournoi des villes de France, en webapp

Chaque joueur défend **sa ville** : un **Défi du Jour** commun à toute la France
(quiz, devinettes, vrai/faux…), et chaque bonne réponse fait monter sa ville et
son département dans le classement national.

- **Produit** : PWA installable, mobile-first, cible 40-70 ans (gros boutons, vocabulaire simple)
- **Stack** : Next.js (App Router) + TypeScript + Tailwind, Vercel, Supabase, Stripe
- **Design** : « médiéval héraldique festif » — voir `src/app/globals.css` (palette verrouillée)

---

## 1. Installation en local (5 minutes, un clic après l'autre)

### Prérequis
- **Node.js 20+** : https://nodejs.org (version LTS, bouton « Installer »)
- Un terminal (Terminal sur Mac, PowerShell sur Windows)
- Un compte **GitHub** (https://github.com), un compte **Supabase** (https://supabase.com), un compte **Vercel** (https://vercel.com)

### Étapes
1. Télécharge ce dossier (ou `git clone` si le dépôt est sur GitHub), puis ouvre un terminal **dedans**.
2. Installe les dépendances :
   ```bash
   npm install
   ```
3. Crée ton fichier de variables :
   ```bash
   cp .env.example .env.local
   ```
   (Remplis `.env.local` à l'étape 2 du projet, quand le projet Supabase existera. Pour tester l'accueil tout de suite, tu peux le laisser vide.)
4. Lance le serveur de développement :
   ```bash
   npm run dev
   ```
5. Ouvre **http://localhost:3000** dans ton navigateur → tu dois voir l'accueil parchemin avec Margot.

Pour arrêter : `Ctrl + C` dans le terminal.

### Tester avant déploiement
- `npm run dev` — serveur local avec rechargement automatique
- `npm run build` — vérifie que le projet compile sans erreur (à faire avant chaque déploiement)
- `npm run lint` — vérifie la qualité du code

---

## 2. Créer le projet Supabase (pas-à-pas)

> Supabase = la base de données + le système de connexion. Plan gratuit suffisant en dev.

1. Va sur https://supabase.com → **Start your project** → connecte-toi avec GitHub.
2. Clique **New project** :
   - **Name** : `interter`
   - **Database Password** : choisis un mot de passe long et note-le précieusement
   - **Region** : `West EU (Paris)`
   - Clique **Create new project** et attends ~2 minutes.
3. Dans le menu gauche : **Project Settings** (roue dentée) → **API** :
   - Copie **Project URL** → colle-le dans `.env.local` sur la ligne `NEXT_PUBLIC_SUPABASE_URL`
   - Copie **anon public** → ligne `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copie **service_role** (secret !) → ligne `SUPABASE_SERVICE_ROLE_KEY`
4. Le schéma SQL se trouve dans `supabase/migrations/` (étape 1 du projet). Pour l'appliquer : menu gauche **SQL Editor** → **New query** → colle le contenu du fichier → **Run**.

---

## 3. Déploiement sur Vercel (pas-à-pas)

1. Va sur https://vercel.com → **Sign Up** avec GitHub.
2. **Add New** → **Project** → choisis le dépôt `interter` → **Import**.
3. Avant de cliquer Deploy, ouvre **Environment Variables** et ajoute les 3 variables Supabase de ton `.env.local` (mêmes noms, mêmes valeurs).
4. Clique **Deploy** → attends ~2 minutes → ton site est en ligne sur une URL `interter.vercel.app`.

### ⚠️ Alertes et plafonds de dépense (à faire dès le setup)
- **Vercel** : Settings → **Billing** → vérifie que tu es sur le plan **Hobby** (0 €). Active les notifications de usage dans Settings → Usage.
- **Supabase** : Project Settings → **Billing** → le plan Free a un plafond dur (projet suspendu, pas de facture surprise). Active les emails d'alerte à 80 % dans **Billing → Usage alerts**.

---

## 4. Configuration OAuth (Google + Facebook) — Étape 2 du projet

### Google
1. https://console.cloud.google.com → **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID** → type **Web application**.
2. **Authorized redirect URIs** : `https://TON-PROJET.supabase.co/auth/v1/callback`
3. Copie le **Client ID** et le **Client Secret**.
4. Dans Supabase : **Authentication** → **Providers** → **Google** → active, colle ID + Secret → **Save**.

### Facebook
1. https://developers.facebook.com → **My Apps** → **Create App** (type Consumer).
2. **Facebook Login** → **Settings** → **Valid OAuth Redirect URIs** : `https://TON-PROJET.supabase.co/auth/v1/callback`
3. Copie **App ID** et **App Secret** → Supabase → **Authentication** → **Providers** → **Facebook** → active → colle → **Save**.

---

## 5. Emails transactionnels (à l'activation du domaine)

MX Plan OVH, à configurer dans Supabase : **Authentication** → **Emails** → **SMTP settings** avec les paramètres SMTP de ton MX Plan (serveur, port, identifiant, mot de passe).

---

## 6. Structure du projet

```
interter/
├── src/
│   ├── app/            # Pages (App Router Next.js)
│   ├── components/     # Composants UI (Bouton, Carte, icônes SVG maison)
│   └── lib/            # Utilitaires (client Supabase, etc.)
├── public/
│   ├── logo/           # Logo (placeholders SVG → remplacés par les fichiers finaux)
│   └── mascotte/       # Margot, 4 poses (placeholders → WebP fournis plus tard)
├── supabase/
│   └── migrations/      # Schéma SQL exportable (reversibilité : Netlify, VPS OVH…)
├── .env.example         # Modèle des variables d'environnement
└── public/manifest.json # Manifeste PWA (installable écran d'accueil)
```

---

## 7. Reversibilité (sortie possible de Supabase/Vercel)

- Le schéma complet de la base est versionné dans `supabase/migrations/` (SQL standard PostgreSQL, exportable).
- L'app est une Next.js standard : déployable sur Netlify ou un VPS OVH sans changement de code.
- Pas de dépendance propriétaire : Supabase et Stripe sont remplaçables indépendamment.

---

## Prochaines étapes du projet

- **Étape 1** : base de données Supabase (schéma SQL, RLS, RPC anti-triche, import des 34 900 communes)
- **Étape 2** : auth OAuth + choix de ville
- **Étape 3** : quiz d'essai, Défi du Jour, épreuves locales, classements
- **Étape 4** : Stripe Supporter 4,99 €
- **Étape 5** : back-office admin
