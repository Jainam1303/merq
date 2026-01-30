# MerQPrime DB Provisioning Notes

## Ownership Boundaries

**Node (Product DB) owns:**
- users
- plans
- subscriptions
- payments
- refresh_tokens
- user_strategies
- user_profiles (encrypted broker credentials)

**Python (Algo DB) owns:**
- trades
- executions
- logs

No cross-service writes. No shared tables. Each service writes only to its own DB.

## Foreign Keys

All foreign keys are enforced within each service boundary. There are **no** cross-service foreign keys.

## Transactions

All multi-step writes should be performed inside transactions:
- Node: user creation + initial plan mapping, payment verification + subscription activation
- Python: trade creation + execution writes

## Provisioning Strategy

1. Provision PostgreSQL instances (or schemas) for Node and Python.
2. Create tables with `docs/db-schema-node.sql` and `docs/db-schema-algo.sql`.
3. Enable Node → Python internal calls.

## Trust Boundaries

- Node authenticates users and signs internal requests.
- Python trusts `user_id` only on signed requests.
- Client never talks to Python directly.
- Broker credentials are stored encrypted at rest (AES-256-GCM).
