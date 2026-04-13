# Deployment + Custom Domain Guide (Final Phase)

This guide deploys the Flask app to Render and connects a real custom domain.

## 1) Merge Feature Work To Main

Use your already-pushed branch:
- `feature/thermal-camera-input`

Create PR:
- https://github.com/RoshanAnandSeeli/PythonMP/pull/new/feature/thermal-camera-input

Merge into `main` before creating the production service.

## 2) Create Render Web Service

1. Go to https://render.com and sign in with GitHub.
2. Click `New +` -> `Web Service`.
3. Select repository: `RoshanAnandSeeli/PythonMP`.
4. Branch: `main`.
5. Runtime: `Python`.
6. Build Command:

```bash
pip install -r requirements.txt
```

7. Start Command:

```bash
gunicorn webapp.app:app
```

8. Instance type: Free/Starter first (upgrade later if needed).
9. Click `Create Web Service`.

## 3) Create Managed Database On Render

1. In Render dashboard, create a `PostgreSQL` service.
2. Copy its `Internal Database URL` (or External URL if needed).
3. In your Web Service -> `Environment`, set:
- `DATABASE_URL` = your Render Postgres URL
- `SECRET_KEY` = long random string
- `APP_USERNAME` = your admin username
- `APP_PASSWORD` = strong password

4. Trigger `Manual Deploy` -> `Deploy latest commit`.

## 4) Verify Production App Before Domain

Test your Render URL:
- Landing page loads
- Login works
- `/app` dashboard works
- `/sensor` camera page works over HTTPS
- `/profiles`, `/simulate`, `/history` return expected data

## 5) Buy/Claim Student Domain (GitHub Education)

1. Open GitHub Student Developer Pack benefits.
2. Claim available domain partner offer.
3. Register your chosen domain (example: `yourproject.site`).
4. Open DNS management in your domain provider panel.

## 6) Connect Custom Domain To Render

1. In Render Web Service -> `Settings` -> `Custom Domains`.
2. Add:
- apex/root: `yourdomain.com`
- subdomain: `www.yourdomain.com`

3. Render shows required DNS records. Add exactly those records at your domain provider.

Typical pattern:
- `www` as `CNAME` -> your Render hostname
- root (`@`) as `A` records or `ALIAS/ANAME` (as instructed by Render)

4. Wait for DNS propagation (few minutes to several hours).

## 7) Force HTTPS + Final Camera Check

1. Ensure Render SSL certificate is issued (automatic).
2. Enable HTTPS redirect in Render settings.
3. Test on phone browser using `https://yourdomain.com/sensor`.
4. Tap `ACTIVATE_THERMAL_CAMERA` and grant camera permission.

## 8) Go-Live Checklist

- [ ] No default credentials in production env vars
- [ ] Database connected (not SQLite fallback)
- [ ] Main routes load without server errors
- [ ] Camera works on HTTPS domain
- [ ] Team PR merged and tagged

## 9) Optional Nice-to-Haves

- Add uptime monitoring (UptimeRobot)
- Add error monitoring (Sentry)
- Add a simple admin/logout timeout policy
- Add a privacy note for camera usage on `/sensor`
