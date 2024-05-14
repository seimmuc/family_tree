FROM node:20-alpine as gtenv
WORKDIR /gentree
COPY package.json package-lock.json .npmrc ./
RUN npm clean-install --omit=dev

FROM gtenv as gtbuild
RUN npm clean-install --include=dev
COPY .en[v] .en[v].local .en[v].production .en[v].production.local svelte.config.js vite.config.ts tsconfig.json ./
COPY src/ ./src/
COPY static/ ./static/
COPY project.inlang/ ./project.inlang/
COPY messages/ ./messages/
RUN npm run build

FROM gtenv as gtwebserv
RUN rm package-lock.json .npmrc
COPY --from=gtbuild /gentree/build /gentree/build
ENV PORT=80
ENTRYPOINT ["node", "build"]

FROM nginx:stable-alpine as nginxproxy
# Set up nginx config
RUN rm /etc/nginx/conf.d/*
COPY deploy/gentree_nginx.conf /etc/nginx/conf.d/gentree_nginx.conf
# Copy over static files from build
WORKDIR /gentreerp
COPY --from=gtbuild /gentree/build/client/ ./static
