CREATE TABLE IF NOT EXISTS users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(120) NOT NULL CHECK (btrim(name) <> ''),
  email VARCHAR(255) NOT NULL UNIQUE CHECK (btrim(email) <> ''),
  password_hash TEXT NOT NULL CHECK (btrim(password_hash) <> ''),
  role VARCHAR(5) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vehicles (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  make VARCHAR(100) NOT NULL CHECK (btrim(make) <> ''),
  model VARCHAR(100) NOT NULL CHECK (btrim(model) <> ''),
  category VARCHAR(100) NOT NULL CHECK (btrim(category) <> ''),
  price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
