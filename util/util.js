require('dotenv').config();
const { promisify } = require('util'); // util from native nodejs library
const crypto = require('crypto');
const { READ_WEIGHT, READ_DIVISION, LIKE_WEIGHT, LIKE_DIVISION, COMMENT_WEIGHT, COMMENT_DIVISION, RATE_LIMIT_TIME, RATE_LIMIT_TTL } = process.env;
const randomBytes = promisify(crypto.randomBytes);
const Cache = require(`${__dirname}/cache`);

const wrapAsync = (fn) => {
    return function (req, res, next) {
        fn(req, res, next).catch(next);
    };
};

const timeDecayer = (curr, createdAt) => {
    const currInHour = Math.floor(new Date(curr).getTime() / 1000 / 60 / 60);
    const createdAtInHour = Math.floor(new Date(createdAt).getTime() / 1000 / 60 / 60);
    let timeDecay = currInHour - createdAtInHour;

    let decayWeight;

    if (timeDecay <= 2) {
        decayWeight = 1;
    } else if (timeDecay <= 6) {
        decayWeight = 1.2;
    } else if (timeDecay <= 24) {
        decayWeight = 1.3;
    } else {
        decayWeight = 1.5 * Math.pow(1.01, Math.floor(timeDecay / 24));
    }

    return decayWeight;
};

// S3 upload img
const aws = require('aws-sdk');
const { S3_REGION: region, S3_BUCKET_NAME: bucketName, S3_ACCESS_KEY: accessKeyId, S3_SECRET_ACCESS_KEY: secretAccessKey } = process.env;

const s3 = new aws.S3({
    region,
    accessKeyId,
    secretAccessKey,
    signatureVersion: 'v4',
});

const generateUploadURL = async (folder = '') => {
    const rawByte = await randomBytes(16);
    const imageName = rawByte.toString('hex') + '.jpg';

    const params = {
        Bucket: bucketName,
        Key: folder + imageName,
        Expires: 60,
        ContentType: 'image/jpeg',
    };

    const uploadURL = await s3.getSignedUrlPromise('putObject', params);

    return { uploadURL, imageName };
};

const articleWeightCounter = (article, userPreference) => {
    let { category, readCount, likeCount, commentCount, createdAt, author } = article;
    let { subscribe, follower } = userPreference;

    let weight = 0;
    weight += category.reduce((prev, curr) => prev + (parseInt(subscribe[curr]) || 0), 1);

    if (author) {
        weight *= follower.includes(author._id) ? 3 : 1;
    }

    if (readCount) {
        weight *= Math.pow(parseInt(READ_WEIGHT), Math.floor(readCount / READ_DIVISION));
    }
    if (likeCount) {
        weight *= Math.pow(parseInt(LIKE_WEIGHT), Math.floor(likeCount / LIKE_DIVISION));
    }
    if (commentCount) {
        weight *= Math.pow(parseInt(COMMENT_WEIGHT), Math.floor(commentCount / COMMENT_DIVISION));
    }
    // console.log(READ_WEIGHT, LIKE_WEIGHT, COMMENT_WEIGHT);

    const decayWeight = timeDecayer(new Date(), createdAt);

    weight = Number((weight / decayWeight).toFixed(3));

    return weight;
};

const rateLimiter = async (req, res, next) => {
    if (!Cache.ready) {
        console.log('[ERROR]: redis fail, skip rate limiter route...');
        next();
    }

    try {
        const { ip } = req;
        const request = await Cache.incr(ip);

        //Setting ttl for ip
        if (request == 1) {
            await Cache.expire(ip, RATE_LIMIT_TTL);
        }

        if (request > 100) {
            console.warn(`[Warning] Rate Limit Block for ${ip}`);
            return res.status(429).json({ error: 'Too much request.' });
        }

        console.log(`${ip} pass Rate limiter...`);
        next();
    } catch (error) {
        console.log('[ERROR]: rate limiter');
        console.error(error);
        next();
    }
};

module.exports = {
    wrapAsync,
    timeDecayer,
    generateUploadURL,
    articleWeightCounter,
    rateLimiter,
};
