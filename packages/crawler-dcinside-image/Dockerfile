FROM node:12-alpine AS build

WORKDIR /srv
COPY package*.json /srv/
COPY .npmrc.docker /srv/.npmrc
ARG GITHUB_TOKEN
#RUN npm set unsafe-perm && npm ci
RUN npm set unsafe-perm && npm install

COPY tsconfig.json /srv/
COPY src /srv/src/
RUN npm run tsc

ARG GITHUB_TOKEN
#RUN npm ci --production
RUN npm install

FROM alpine:3
RUN apk add nodejs --no-cache
WORKDIR /srv
COPY --from=build /srv/node_modules /srv/node_modules
COPY --from=build /srv/build/src /srv/
CMD node index.js
