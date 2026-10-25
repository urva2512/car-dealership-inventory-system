# Car Dealership Inventory System

## Prerequisites

- Node.js 18 or later
- PostgreSQL 17 with a `car_dealership` database

## Backend

```powershell
cd backend
Copy-Item .env.example .env
npm install
npm run db:init
npm run dev
```

Set the database credentials and JWT settings in `backend/.env` before starting the server. The backend listens on `http://localhost:3000` by default.

Run backend checks with `npm test`, `npm run typecheck`, and `npm run build` from `backend`.

## Sample Indian-market inventory

The project includes an explicit, repeatable demo-inventory command with 26 real Indian-market vehicles. It is never run automatically.

> Warning: this command deletes **every row in the `vehicles` table** and replaces it with the sample inventory. It does not delete users, administrator accounts, or alter the schema. The current schema has no purchase-history table or foreign keys pointing to `vehicles`.

After checking that `backend/.env` targets the intended database, run this from `backend`:

```powershell
npm run db:reset-sample-inventory
```

The operation runs in one transaction: if an insert fails, the vehicle deletion is rolled back. Re-running the command replaces the same inventory rather than creating duplicates. Prices are INR; the existing schema supports make, model, category, price, and quantity only (not model year or image URLs).

## Frontend

In a second terminal:

```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```

The frontend opens on the Vite URL shown in the terminal, normally `http://localhost:5173`. `frontend/.env` may set `VITE_API_URL`; it defaults to `http://localhost:3000/api`.

Run frontend checks with:

```powershell
npm test
npm run typecheck
npm run build
```

The UI supports inventory search and sorting, registration/login, authenticated purchase confirmation, and an admin inventory dashboard. Vehicle detail edits never change stock: stock can change only through an admin restock or a successful purchase. The backend remains responsible for authorization and stock integrity.

## Registration and administrator setup

Public registration always creates a `user` account and immediately signs that account in with the session returned by the backend. The registration form does not accept a role.

To bootstrap the first administrator in local development, run this explicit one-time command from `backend`:

```powershell
npm run user:promote-admin -- --name "Urva Patel"
```

The command makes no change unless exactly one account matches the supplied full name. It never runs when the backend starts. As a SQL-only alternative, use the account's exact email:

```sql
UPDATE users
SET role = 'admin'
WHERE email = 'replace-with-urvas-email@example.com'
  AND role = 'user'
RETURNING id, name, email, role;
```

This is a one-time local setup action; it is not run by the application. Sign out and sign back in after the update so the JWT contains the new `admin` role.

Once signed in as an admin, use the **Create administrator** panel in the frontend to create additional admin accounts. The backend enforces this with an authenticated admin-only `POST /api/auth/admin` endpoint. It returns the new account's public fields only; no password hash or JWT is returned.
"# car-dealership-inventory-system" 
