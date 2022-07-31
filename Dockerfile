FROM node:17-alpine

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY . .
RUN npm install

COPY ./cronjobs /etc/crontabs/root

CMD ["sh", "-c", "crond && /usr/local/bin/node /usr/src/app/app.js"]