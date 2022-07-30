require('dotenv').config();
const Redis = require('ioredis');
const { CACHE_PORT, CACHE_USER, CACHE_PASSWORD } = process.env;
const retryTimes = 1;
let cacheHost = 'localhost';

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
