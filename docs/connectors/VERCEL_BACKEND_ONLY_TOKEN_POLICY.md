# Vercel Backend-Only Token Policy

## Policy

`VERCEL_TOKEN` is a backend-only secret. It must exist only in Railway api-server runtime variables and must never be copied into the Vercel dashboard build environment.

## Frontend prohibitions

The dashboard must not:

- define `VITE_VERCEL_TOKEN` or any similar frontend token variable;
- call Vercel APIs directly;
- send an Authorization header for Vercel;
- store credentials in browser storage or cookies;
- render credential input UI for this connector.

## Backend boundaries

The backend connector may use the token only for read-only `GET` requests to Vercel API endpoints. It must not perform `POST`, `PATCH`, `PUT` or `DELETE` requests and must not trigger redeploys, change project settings, change domains or read/write environment variables from Vercel.

## Logging

Activity logs are safe operational metadata only. They must not include token values, environment values, Authorization headers, build logs or secrets.
