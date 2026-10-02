# PrintHubASIET

PrintHubASIET is a static campus print-ordering demo for ASIET. It includes student and staff portals, print pricing, finishing services, order status tracking, and collection notifications.

## Run locally

Open `index.html` in a browser, or use the VS Code Live Server extension.

## Demo staff login

- Staff ID: `STAFF001`
- Password: `1234`

This is a demo login only. Authentication is implemented in client-side JavaScript and must not be used to protect real staff access.

## Data limitations

Orders are stored in browser `localStorage` and sync between tabs in the same browser. They do not sync between devices or browsers. PDF files are not uploaded to a server; only order metadata is stored.

## GitHub Pages

The included workflow deploys the site to GitHub Pages whenever changes are pushed to `main`. In the repository, open **Settings → Pages** and set the build and deployment source to **GitHub Actions**. After the workflow completes, GitHub will show the site URL in the Pages settings and deployment summary.