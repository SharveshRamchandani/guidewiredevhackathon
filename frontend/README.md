# GigShield Frontend

Worker and admin React frontend for GigShield, a parametric income-protection platform for delivery gig workers.

## Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Zustand
- React Router
- Vitest

## Main Flows

- Worker OTP onboarding with profile, KYC, UPI, and plan selection
- Weekly policy purchase and renewal
- Worker dashboard, claims, payouts, policy, profile, and notifications
- Admin dashboard, workers, policies, claims, events, analytics, and fraud views

## Local Development

```bash
cd frontend
npm install
npm run dev
```

Default dev server:

- `http://localhost:8080`

Environment variable:

```env
VITE_API_URL=http://localhost:5000
```

## Notes

- Premiums are displayed on a weekly basis.
- Coverage amounts should be read as maximum payout per claim unless a screen explicitly says otherwise.
- Fraud scores are treated on a `0.0-1.0` scale across the worker and admin UI.
