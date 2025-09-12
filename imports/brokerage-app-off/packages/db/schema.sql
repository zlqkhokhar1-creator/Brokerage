CREATE TABLE "users" (
  "id" SERIAL PRIMARY KEY,
  "email" varchar UNIQUE NOT NULL,
  "password" varchar NOT NULL,
  "created_at" timestamp DEFAULT (now())
);

CREATE TABLE "portfolios" (
  "id" SERIAL PRIMARY KEY,
  "user_id" integer REFERENCES "users"("id"),
  "cash_balance" decimal NOT NULL DEFAULT 0,
  "created_at" timestamp DEFAULT (now())
);

CREATE TABLE "trades" (
  "id" SERIAL PRIMARY KEY,
  "portfolio_id" integer REFERENCES "portfolios"("id"),
  "symbol" varchar NOT NULL,
  "quantity" integer NOT NULL,
  "price" decimal NOT NULL,
  "type" varchar NOT NULL,
  "created_at" timestamp DEFAULT (now())
);

CREATE TABLE "savings" (
  "id" SERIAL PRIMARY KEY,
  "user_id" integer REFERENCES "users"("id"),
  "balance" decimal NOT NULL DEFAULT 0,
  "apy" decimal NOT NULL,
  "created_at" timestamp DEFAULT (now())
);
