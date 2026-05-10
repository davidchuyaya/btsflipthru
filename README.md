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
2. Install postgres: `sudo apt install postgres` and import old data.
3. Install [pnpm](https://pnpm.io/installation#on-posix-systems), then use it to install Node.js
4. Clone this repo
5. Install dependencies: `pnpm i`
6. Copy the environment file to the remote server: `scp .env root@server-ip:~/bts-flip-thru/.env`. Modify `BETTER_AUTH_URL` to use `https://btsflipthru.com`
7. Set the postgres password by following instructions [here](https://serverfault.com/a/325596/1048565).
8. Load the database: `psql -U postgres -d postgres -h 127.0.0.1 -f schema.sql`
9. Import old database data: `psql -U postgres -d postgres -h 127.0.0.1 -f exported.sql`. Note: This file is not in the repo.
10. Refresh materialized views: `psql -U postgres -d postgres -h 127.0.0.1 -f refresh.sql`
11. Build the app: `npm run build`
12. Start the app and keep it running: `npx pm2 start ecosystem.config.js`
13. Make PM2 persist across reboots:
    - Run `npx pm2 startup` and execute the command it provides.
    - Run `npx pm2 save` to save the process list.
14. Point DNS records to the server and set up [caddy](https://caddyserver.com/docs/quick-starts/https) with HTTPS.
    - Link the project Caddyfile: `sudo ln -sf $(pwd)/Caddyfile /etc/caddy/Caddyfile`
    - Reload Caddy: `sudo systemctl reload caddy`
15. Add a cron job to refresh materialized views: `sudo crontab -e`

### Deploying

1. Pull changes: `git pull`
2. Update postgres if schema changed: `npm run load-local-db`
3. Build: `npm run build`
4. Restart the app: `npx pm2 restart Flipthru`

### Backing up the database

1. Export the database: `pg_dump -a -U postgres -d postgres -h 127.0.0.1 -f exported.sql`
2. Copy the file somewhere safe.
