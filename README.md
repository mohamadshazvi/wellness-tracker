This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Firebase setup

Each account is stored as a single document, `users/{uid}`, holding a
`history` map of `YYYY-MM-DD` to that day's entry. `firestore.rules` restricts
every document to its owning account.

### 1. Enable Firestore

The project needs a Firestore database. Until one exists, every read and write
fails with `permission-denied` or "Cloud Firestore API has not been used in
project … before or it is disabled". Creating the database also enables the API:

- **Console (simplest):** open
  [Firestore Database](https://console.firebase.google.com/project/wellness-tracker-bb385/firestore)
  → **Create database** → start in **production mode** (the rules below replace
  the permissive defaults), and pick a region close to your users.
- **CLI:** `gcloud services enable firestore.googleapis.com --project wellness-tracker-bb385`
  then create the database in the Console — enabling the API alone does not
  provision one.

### 2. Deploy the security rules

```bash
npx firebase-tools login                           # one-time, opens a browser
npx firebase-tools deploy --only firestore:rules
```

`.firebaserc` pins the default project to `wellness-tracker-bb385`, so the
deploy cannot target the wrong project by accident.

### 3. Verify

Sign in with one account, then confirm a second account cannot read the first
account's document. The app reports sync failures under **Profile → Database
Sync** and as a banner on the other tabs.
