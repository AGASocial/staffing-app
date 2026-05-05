# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Next.js 16 App Router** staffing application with voice agent capabilities. It uses React 19, TypeScript, Supabase for auth/database, Stripe/PayU for payments, Retell AI for voice agents, and supports English/Spanish internationalization.

## Development Commands

### Package Management
- `npm install` - Install dependencies
- `npm ci` - Install dependencies for CI/CD

### Build Commands
- `npm run build` - Build the project for production
- `npm run dev` - Start development server (Next.js with Turbopack)
- `npm start` - Start production server

### Testing Commands
- `npm test` - Run Jest unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:e2e` - Run Playwright e2e tests
- `npm run test:e2e:ui` - Run Playwright with UI mode
- `npm run test:e2e:headed` - Run Playwright in headed mode
- `npm run test:all` - Run both Jest and Playwright

### Code Quality Commands
- `npm run lint` - Run ESLint (eslint-config-next)

## Technology Stack

### Core
- **Next.js 16** - App Router with Turbopack dev server
- **React 19** - UI library
- **TypeScript 5** - Static type checking
- **Tailwind CSS 4** - Styling with `@tailwindcss/postcss`

### UI Components
- **Radix UI** - Headless accessible components (shadcn/ui pattern)
- **Lucide React** - Icons
- **Framer Motion** - Animations
- **class-variance-authority + clsx + tailwind-merge** - Component variants
- **Sonner** - Toast notifications

### Backend / Data
- **Supabase** - Auth, database, and storage (`@supabase/ssr`, `@supabase/auth-helpers-nextjs`)
- **TanStack Query v5** - Server state management and data fetching
- **Zod** - Schema validation
- **React Hook Form** + `@hookform/resolvers` - Form handling

### Payments
- **Stripe** - Primary payment processing (`stripe`, `@stripe/react-stripe-js`)
- **PayU** - Alternative payment gateway (env-configured via `NEXT_PUBLIC_PAYMENT_GATEWAY`)

### Integrations
- **OpenAI** - AI features
- **Retell AI** - Voice agent platform (`RETELL_API_KEY`, `RETELL_FROM_NUMBER`)
- **Resend** - Transactional emails
- **bcryptjs** - Password hashing
- **jose** - JWT utilities

### Internationalization
- **next-intl** + **i18next** + **react-i18next** - EN/ES support
- Locale files located in `src/i18n/`

### Testing
- **Jest** + **jest-environment-jsdom** - Unit tests
- **@testing-library/react** + **@testing-library/user-event** - Component testing
- **Playwright** - End-to-end tests

## Project Structure

```
src/
├── app/           # Next.js App Router pages and layouts
├── components/    # Reusable UI components (shadcn/ui pattern)
├── constants/     # Application constants
├── context/       # React context providers
├── hooks/         # Custom React hooks
├── i18n/          # Internationalization config and locale files
├── lib/           # Library utilities (supabase client, stripe, etc.)
├── models/        # Data models and types
└── middleware.ts  # Next.js middleware (auth, locale routing)
```

### Naming Conventions
- **Files**: kebab-case (`user-profile.tsx`)
- **Components**: PascalCase (`UserProfile`)
- **Functions**: camelCase (`getUserData`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`)
- **Types/Interfaces**: PascalCase (`UserData`, `ApiResponse`)

## TypeScript Guidelines

- Enable strict mode in `tsconfig.json`
- Use explicit types for function parameters and return values
- Avoid `any` — use `unknown` when type is truly unknown
- Use Zod schemas for runtime validation at API boundaries
- Leverage utility types (`Partial`, `Pick`, `Omit`, etc.)

## Environment Variables

Required variables (see `.env` for reference):
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` / `STRIPE_WEBHOOK_SECRET`
- `OPENAI_API_KEY`
- `RETELL_API_KEY` / `RETELL_FROM_NUMBER`
- `RESEND_API_KEY`
- `STORAGE_MASTER_KEY` (encryption)
- `NEXT_PUBLIC_PAYMENT_GATEWAY` (`stripe` or `payu`)

## Security Guidelines

- Sanitize user inputs; validate with Zod at API routes
- Never expose `SUPABASE_SERVICE_ROLE_KEY` or `STRIPE_SECRET_KEY` to the client
- Use `NEXT_PUBLIC_` prefix only for safe-to-expose values
- Regularly audit dependencies with `npm audit`

## Development Workflow

### Before Starting
1. `npm install`
2. Copy environment variables to `.env`
3. Verify Supabase project is running

### Before Committing
1. Run tests: `npm test`
2. Check linting: `npm run lint`
3. Test production build: `npm run build`
