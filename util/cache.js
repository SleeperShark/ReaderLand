require('dotenv').config();
const Redis = require('ioredis');
const { CACHE_HOST, CACHE_PORT, CACHE_USER, CACHE_PASSWORD, NODE_ENV } = process.env;
const retryTimes = NODE_ENV != 'production' ? 1 : 5;
let cacheHost = NODE_ENV == 'docker-env' ? '127.0.0.1' : CACHE_HOST;

const redisClient = new Redis({
    port: CACHE_PORT,
    host: cacheHost,
    username: CACHE_USER,
    password: CACHE_PASSWORD,
    retryStrategy(times) {
        const delay = Math.min(times * 500, 100000);
        if (times >= retryTimes) {
            return 'stop connect';
        }
        return delay;
    },
});

redisClient.ready = false;

redisClient.on('ready', () => {
    redisClient.ready = true;
    console.log('Redis is ready...');
});

redisClient.on('error', (error) => {
    redisClient.ready = false;
    console.log('Error in redis...');
    console.log(error);
});

redisClient.on('end', () => {
    redisClient.ready = false;
    console.log('Redis is disconnected...');
});

module.exports = redisClient;
