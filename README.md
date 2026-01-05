# BTS Flipthru
See the [About Page](https://btsflipthru.com/about) for more information.

## Development
We use the following technologies:
- Next.js (Server)
- Better-auth (Authentication)
- Kysely (Database ORM)
- TailwindCSS (Styling)
- Neobrutalism (UI)
- Shadcn UI (Used by Neobrutalism)
- Postgres (Database)
- Contabo (Server)
- Caddy (HTTPS)

### Modifying the Schema
1. Modify `schema.sql`
2. Update postgres: `npm run load-local-db`
3. Update types: `npm run kysely-codegen`

### Setting up the Server
1. Set up firewalls with `ufw`, only allow SSH, HTTP, and HTTPS
2. Install postgres: `sudo apt install postgres` and import old data. Immediately execute `refresh.sql` to refresh materialized views.
3. Install [pnpm](https://pnpm.io/installation#on-posix-systems), then use it to install Node.js
4. Clone this repo
5. Install dependencies: `pnpm i`
6. Copy the environment file to the remote server: `scp .env root@server-ip:~/bts-flip-thru/.env`
7. Load the database: `npm run load-local-db`
8. Generate types: `npm run kysely-codegen`
9. Build the app: `npm run build`
10. Start the app and keep it running: `pm2 start npm -- start`
11. Point DNS records to the server and set up [caddy](https://caddyserver.com/docs/quick-starts/https) with HTTPS
12. Add a cron job to refresh materialized views: `sudo crontab -e`

### Deploying
1. Pull changes: `git pull`
2. Update postgres if schema changed: `npm run load-local-db`
3. Build: `npm run build`
4. Restart the app: `pm2 restart all`