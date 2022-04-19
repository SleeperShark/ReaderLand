require('dotenv').config();
const { promisify } = require('util'); // util from native nodejs library
const jwt = require('jsonwebtoken');
const User = require('../server/models/user_model');
const { TOKEN_SECRET } = process.env;

const wrapAsync = (fn) => {
    return function (req, res, next) {
        fn(req, res, next).catch(next);
    };
};

const authentication = (roleId, required = true) => {
    return async function (req, res, next) {
        let accessToken = req.get('Authorization');

        if (!accessToken) {
            if (!required) {
                return next();
            }

            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        accessToken = accessToken.replace('Bearer ', '');
        if (accessToken == 'null') {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        try {
            const user = await promisify(jwt.verify)(accessToken, TOKEN_SECRET);
            req.user = user;
            if (roleId == null) {
                next();
            } else {
                let result;
                if (roleId == User.USER_ROLE.ALL) {
                    result = await User.getUserDetail(user.email);
                } else {
                    result = await User.getUserDetail(user.email, roleId);
                }
                if (result.error) {
                    res.status(403).json({ error: 'Forbidden' });
                } else {
                    const userDetail = result.user;
                    console.log(`User ${req.user.name} pass authentication...`);
                    req.user.userId = userDetail._id;
                    req.user.roleId = userDetail.role;
                    next();
                }
            }
            return;
        } catch (error) {
            console.log(error);
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
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

module.exports = {
    wrapAsync,
    authentication,
    timeDecayer,
};
