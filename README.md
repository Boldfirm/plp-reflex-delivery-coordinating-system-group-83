# plp-reflex-delivery-coordinating-system-group-83
Group 83 - Reflex Readiness Sprint

## Local Setup

This project runs an Express backend and serves the frontend from `frontend/`.
The default local mode uses `backend/data/db.json`, so MySQL is not required for
basic testing.

```bash
npm install
npm start
```

Open http://localhost:4000.

Demo accounts:

| Role | Email | Password |
| --- | --- | --- |
| Retailer | `jane@gmail.com` | `123456` |
| Dispatcher | `dispatcher@reflex.com` | `123456` |
| Rider | `brian@gmail.com` | `123456` |
| Rider | `mercy@gmail.com` | `123456` |

## Private Environment Variables

Create a local `.env` file in the project root. The file is ignored by Git and
must never be committed or pushed to GitHub.

Use placeholders until the real credentials are available:

```env
# Server
PORT=4000

# Optional MySQL mode
DB_HOST=localhost
DB_USER=
DB_PASSWORD=
DB_NAME=reflex_db
DB_PORT=3306

# Gmail / Google OAuth2 mail delivery
GMAIL_USER=your-gmail-address@gmail.com
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
GOOGLE_REDIRECT_URI=https://developers.google.com/oauthplayground
GOOGLE_REFRESH_TOKEN=your-google-refresh-token

# M-Pesa Daraja
MPESA_ENV=sandbox
MPESA_CONSUMER_KEY=your-daraja-consumer-key
MPESA_CONSUMER_SECRET=your-daraja-consumer-secret
MPESA_SHORTCODE=your-business-shortcode
MPESA_PASSKEY=your-lipa-na-mpesa-passkey
MPESA_CALLBACK_URL=https://your-public-domain.example/api/mpesa/callback
MPESA_AMOUNT=2
```

