# Render Deployment

1. Create a new Render Web Service from the GitHub repository `Fahim7600/City-Complaint-Platform`.
2. Render can use `render.yaml`; otherwise set the build command to `npm install && npx prisma generate && npx prisma migrate deploy && npm run build` and the start command to `npm start`.
3. Add these environment variable names in the Render dashboard: `PORT`, `DATABASE_URL`, `NODE_ENV`, `ALLOWED_ORIGINS`, `ADMIN_SEED_EMAIL`, `ADMIN_SEED_PASSWORD`, `DEMO_USERS_PASSWORD`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRY`, `JWT_REFRESH_EXPIRY`, `GOOGLE_CLIENT_ID`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PREMIUM_PRICE_ID`, `APP_BASE_URL`.
4. Set `APP_BASE_URL` to the deployed Render URL and configure allowed frontend origins in `ALLOWED_ORIGINS`.
5. After deployment, update the Stripe Dashboard webhook endpoint to `https://YOUR-RENDER-URL/api/v1/payments/webhook`. The local `stripe listen` tunnel is only for development and does not exist in production.
6. Verify `https://YOUR-RENDER-URL/api/v1/health` and `/api-docs` after the service starts.