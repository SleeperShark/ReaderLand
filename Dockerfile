FROM node:17-alpine

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY . .
RUN npm install

CMD ["node", "/usr/src/app/app.js"]