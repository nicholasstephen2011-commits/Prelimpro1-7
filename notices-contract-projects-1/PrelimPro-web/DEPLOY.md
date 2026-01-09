# Deployment Modes for PrelimPro-web

This repository supports two deployment modes for the `PrelimPro-web` app:

- `static`: run `next build` then `next export` and publish the static output in `web-build` (suitable for GitHub Pages or static hosts). Note: App Router server features may not be exportable.
- `node`: run `next build` and deploy the `.next` output to a Node-capable host (Vercel, Render, or your own server). The workflow packages `.next` as an artifact for downstream deployment.

How to trigger:

- Automatic deploy (on CI success): the repository has a workflow that runs on CI success and will deploy in the mode configured by repository secret `DEPLOY_MODE` (set to `static` or `node`).
- Manual deploy: use the `Manual Deploy Web` workflow in the GitHub Actions UI and select `deploy_mode` input.

Notes:
- If you use `static` and your app relies on server components or dynamic server-side logic, prefer `node` mode and host on a Node-capable platform.
- To change automatic behavior, set the repo secret `DEPLOY_MODE` to `static` or `node` in Settings → Secrets.
