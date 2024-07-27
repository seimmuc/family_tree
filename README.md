A genealogy tree SvelteKit website.

# Basic deployment instructions

1. Make sure you have docker compose, then clone and cd into this repo.

2. Modify `.env` file or create `.env.local` to modify/override server options.

   ```shell
   cp .env .env.local
   nano .env.local
   ```

3. Run `docker compose -f ./deploy/compose-run-nginx.yaml --project-name family-tree up -d`.

For more deployment options and notes, check out [this page](deploy/Readme.md).
