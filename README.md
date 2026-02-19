# Serch

Serch is a role-based SEO training and digital marketing platform.

## Tech stack

- Vite
- React + TypeScript
- Tailwind + shadcn/ui
- Firebase Auth + Firestore

## Getting started

```sh
npm install
npm run dev
```

## Roles

- **Students**: `/students/*`
- **Instructors**: `/instructors/*`
- **Admins**: `/admin/*`
- **Guest (marketing)**: `/` and `/site`

## Authentication

Auth is handled via Firebase.

- Email/password signup and login
- Google sign-in
- Apple sign-in (requires Apple provider setup in Firebase)

On first login, users may be routed to `/onboarding` to select a hub.
