require('dotenv').config({ path: __dirname + '../.env' });
const Redis = require('ioredis');
const { CACHE_HOST, CACHE_PORT, CACHE_USER, CACHE_PASSWORD, NODE_ENV } = process.env;
const retryTimes = NODE_ENV === 'development' ? 1 : 5;

const redisClient = new Redis({
    port: CACHE_PORT,
    host: CACHE_HOST,
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
