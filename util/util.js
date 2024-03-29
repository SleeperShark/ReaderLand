require('dotenv').config();
const { promisify } = require('util');
const crypto = require('crypto');
const { READ_WEIGHT, READ_DIVISION, LIKE_WEIGHT, LIKE_DIVISION, COMMENT_WEIGHT, COMMENT_DIVISION, RATE_LIMIT_TIME, RATE_LIMIT_TTL, MAILER_USER, MAILER_PASS, FOLLOWER_WEIGHT } =
    process.env;
const randomBytes = promisify(crypto.randomBytes);
const Cache = require(`${__dirname}/cache`);

const sleepInSec = async (sec, msg) => {
    return new Promise((r) => {
        console.log(msg);
        setTimeout(() => {
            r();
        }, sec * 1000);
    });
};

const wrapAsync = (fn) => {
    return function (req, res, next) {
        fn(req, res, next).catch(next);
    };
};

const isObjectEmpty = (target) => {
    if (Object.keys(target).length == 0) {
        return true;
    }
    return false;
};

const modelResultResponder = ({ data, error, status }, response) => {
    if (error) {
        return response.status(status).json({ error });
    } else {
        return response.status(200).json({ data });
    }
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
    follower = follower.map((elem) => elem.toString());

    let weight = 1;
    if (subscribe) {
        weight += category.reduce((prev, curr) => prev + (parseInt(subscribe[curr]) || 0), 0);
    }

    if (follower.includes(author.toString())) {
        weight *= FOLLOWER_WEIGHT;
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

        if (request > RATE_LIMIT_TIME) {
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

//TODO: Node mailer Transporter
const mailer = require('nodemailer').createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: MAILER_USER,
        pass: MAILER_PASS,
    },
    tls: { rejectUnauthorized: false },
});

const sendMailAsync = require('util').promisify(mailer.sendMail).bind(mailer);

const validationEmail = async ({ email, validationToken }) => {
    const mailHTML = `<a href="${process.env.HOST_URL}/api/user/validateEmil?token=${validationToken}" target="_blank">點擊連結驗證信箱</a>`;

    console.log('Sending email for validation...');
    try {
        await sendMailAsync({ from: MAILER_USER, tls: { rejectUnauthorized: false }, to: email, subject: 'ReaderLand 信箱驗證', html: mailHTML });
    } catch (error) {
        console.error('[ ERROR ] sending validation email');
        console.error(error);
        throw error;
    }
};

module.exports = {
    wrapAsync,
    isObjectEmpty,
    modelResultResponder,
    timeDecayer,
    generateUploadURL,
    articleWeightCounter,
    rateLimiter,
    validationEmail,
    sleepInSec,
};
