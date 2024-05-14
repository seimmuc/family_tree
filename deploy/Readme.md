# Running `docker compose up`

Docker compose commands should be ran from the project's root directory. It should look something like this:
```bash
docker compose -f ./deploy/compose-run-nginx.yaml --project-name family-tree up -d
```

# .env file

Vite loads `.env` files when it starts, including during the build process ([learn more](https://vitejs.dev/guide/env-and-mode.html#env-files)). Specifically it loads `.env` and `.env.local` files as well as `.env.[mode]` and `.env.[mode].local` files where `mode` is "development" when running `npm run dev` and "production" when running `npm run build`. Dockerfile is configured to use all production-related .env files during its build.

# Choosing compose config file

There are 3 separate docker compose configurations that you can use when running `docker compose up` depending on your environment.

## Nginx in docker

`compose-run-nginx.yaml` config will run the NodeJS web server behind an nginx reverse proxy. Nginx will serve static files, including media files uploaded by authorized users. This is the reccomended option. Note that if you also have another reverse proxy that modifies X-Forwarded-For header, you'll need to adjust XFF_DEPTH env variable in `compose-webserver-nginx.yaml` file.

## External reverse proxy

`compose-run-extproxy.yaml`: config will expect to be behind your own reverse proxy.Be cautious when using this since improper configuration can cause security issues.

NodeJS web server is configured to be accessible via port 8088 on the host. Make sure that you block external access to this port in your firewall.

You must configure your reverse proxy to set certain headers on each proxied request. Check out `compose-webserver-rp.yaml` and [SvelteKit node adapter docs](https://kit.svelte.dev/docs/adapter-node) to see which headers are expected, and see `gentree_nginx.conf` as a reference for how you should configure your proxy.

You should configure your reverse proxy to serve the website's static files which are placed in `build/client/` directory during the vite build process. Alternatively you may simply cache such files, since the NodeJS server will serve them as well. Doing neither may lead to poor performance.

User-uploaded content will be saved on your host under `production_data/media/` directory using a bind mount. You may change or remove this by editing `compose-webserver-rp.yaml` file. These files should also be served or cached by reverse proxy when handling `/media/*` requests.

## No reverse proxy (not reccomended)

`compose-run-noproxy.yaml`: config exposes NodeJS server on port 80. Intended for development or debugging, avoid using in production. Make sure to edit `ORIGIN` env variable in `compose-webserver-open.yaml` file if needed, failing to do so may lead to broken links and CORS errors.
