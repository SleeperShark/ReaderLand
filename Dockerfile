FROM node:17-alpine

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY . .
RUN npm install

COPY ./cronjobs /etc/crontabs/root
RUN crond 

CMD ["node", "/usr/src/app/app.js"]