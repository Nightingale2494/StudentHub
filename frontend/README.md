# StudentHub Frontend

StudentHub is a React-based student portal for study materials, mock tests, progress tracking, premium access, and admin management.

## What students can do

- Sign up/login and complete onboarding.
- Select their college and department (for example: ECS, FT, IoT, and many others).
- Access department-specific subjects, files, and mock tests.
- Track progress and test attempts.
- Upgrade to premium and access premium resources.

## Department and branch coverage

StudentHub is **not limited to a fixed small department list**. The onboarding department dropdown is populated dynamically from backend APIs:

- Colleges are fetched from `GET /colleges`.
- Departments are fetched from `GET /departments?collegeId=...`.

That means all configured departments/branches in backend data (including large catalogs of 50+ entries) are supported without frontend code changes.

## Tech Stack

- React 19
- React Router
- CRACO + Tailwind CSS
- Axios for API communication
- Radix UI + shadcn/ui-style component primitives

## Prerequisites

- Node.js 20+
- Yarn 1.22.x (as pinned in `package.json`)

## Local Development

From the `frontend` directory:

```bash
yarn install
yarn start
```

The app runs on:

- http://localhost:3000

## Available Scripts

- `yarn start` — start development server.
- `yarn test` — run test runner.
- `yarn build` — create production build.

## Environment Variables

Create a `.env` file inside `frontend/` when needed.

Common variable:

- `REACT_APP_API_URL` — backend base URL (example: `http://localhost:5000/api`).

## Troubleshooting

### Corepack/Yarn download errors in restricted networks

If your environment blocks `registry.yarnpkg.com`, `yarn` may fail to bootstrap via Corepack with a 403 tunneling/proxy error.

Options:

1. Allowlist Yarn/NPM registry domains in your network.
2. Pre-install Yarn 1.22.x in the execution environment.
3. Use an internal registry mirror.

## Notes

- Routing and auth gates are implemented in `src/App.js`.
- Department selection logic is implemented in `src/pages/Onboarding.jsx`.
- Protected areas (dashboard, profile, tests, etc.) require authentication.
