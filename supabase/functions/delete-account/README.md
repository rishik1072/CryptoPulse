# Secure Account Deletion Edge Function

This Supabase Edge Function securely processes user account deletion without exposing the Supabase `service_role` key to frontend clients.

## Security Architecture

1. **Authentication**: The client sends its Supabase user JWT via the standard `Authorization: Bearer <token>` header.
2. **Verification**: The function validates the user's identity via `supabase.auth.getUser()`.
3. **Explicit Confirmation**: The request body MUST contain `{ "confirm": true }`. Requests without explicit confirmation are rejected with HTTP 400.
4. **Privileged Execution**: The user is deleted using `supabaseAdmin.auth.admin.deleteUser(user.id)`, which runs solely on Supabase's secure server infrastructure.
5. **Data Cascading**: Because tables (`profiles`, `portfolios`, `holdings`, `transactions`, `alerts`, etc.) have `ON DELETE CASCADE` foreign keys referencing `auth.users(id)`, all user data is automatically cleaned up in Postgres.

## Environment Variables

These variables are automatically provided by Supabase in production Edge Functions:

- `SUPABASE_URL`: Your Supabase Project URL.
- `SUPABASE_ANON_KEY`: Your Supabase Anon Key.
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role Key (stored securely in Supabase project secrets, NEVER on the frontend).

## Deployment

Deploy this Edge Function to your Supabase project using the Supabase CLI:

```bash
# Login to Supabase CLI
supabase login

# Link your local project to your Supabase project ref
supabase link --project-ref <your-project-ref>

# Deploy the function
supabase functions deploy delete-account --no-verify-jwt
```

Note: `--no-verify-jwt` allows the Edge Function itself to handle custom JWT validation and return appropriate JSON error responses to the frontend client.
