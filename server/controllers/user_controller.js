require('dotenv').config({ path: `${__dirname}/../../.env` });
const validator = require('validator');
const User = require('../models/user_model');
const { generateUploadURL, senddingMail, modelResultResponder } = require(`${__dirname}/../../util/util`);
const Notification = require('../models/notification_model');

const getUserInfo = async (req, res) => {
    let { name, email, picture, userId } = req.user;
    picture = `${process.env.IMAGE_URL}/avatar/${picture}`;
    res.status(200).json({ data: { name, email, picture, userId } });
    return;
};

const signUp = async (req, res) => {
    let { name } = req.body;
    const { email, password } = req.body;

    if (!name || !email || !password) {
        res.status(400).send({ error: 'Request Error: name, email and password are required.' });
        return;
    }

    if (!validator.isEmail(email)) {
        res.status(400).json({ error: 'Request Error: Invalid email format' });
        return;
    }

    name = validator.escape(name);

    const { error, status, data } = await User.signUp(name, email, password);
    if (error) {
        res.status(status).json({ error });
        return;
    }

    const { user, emailValidationToken } = data;

    if (!user) {
        res.status(500).json({ error: 'Database Query Error' });
        return;
    }

    //TODO: Sending Validation mail
    const mailHTML = `
    <a href="${process.env.HOST_URL}/api/user/validateEmil?token=${emailValidationToken}" target="_blank">點擊連結驗證信箱</a>
        `;
    //TODO: sending Validation email
    const { error: mailingError } = await senddingMail({
        to: email,
        subject: 'ReaderLand 信箱驗證',
        html: mailHTML,
        tls: { rejectUnauthorized: false },
    });

    if (mailingError) {
        console.log('Error in sending email');
    }

    //TODO: init Notification document
    Notification.initUserNotification(user._id);

    res.status(200).json({
        data: {
            accessToken: user.accessToken,
            user: {
                id: user._id,
                provider: user.provider,
                name: user.name,
                email: user.email,
                picture: user.picture,
            },
        },
    });
};

const validateEmil = async (req, res) => {
    const validateToken = req.query.token;
    if (!validateToken) {
        res.status(400).json({ error: 'Token is required for email validation.' });
        return;
    }

    const { error, status, data: name } = await User.validateEmailToken(validateToken);

    if (error) {
        res.status(status).json({ error });
        return;
    }

    res.redirect(`/validationResult.html?user=${name}`);
};

const nativeSignIn = async (email, password) => {
    if (!email || !password) {
        return { error: 'Request Error: email and password are required.', status: 400 };
    }
    try {
        return await User.nativeSignIn(email, password);
    } catch (error) {
        return { error };
    }
};

const signIn = async (req, res) => {
    const data = req.body;
    console.log(data);
    let result;

    switch (data.provider) {
        case 'native':
            result = await nativeSignIn(data.email, data.password);
            break;
        // case 'facebook':
        //     result = await facebookSignIn(data.access_token);
        //     break;
        default:
            result = { error: 'Wrong Request' };
    }

    if (result.error) {
        const status_code = result.status ? result.status : 403;
        res.status(status_code).json({ error: result.error });
        return;
    }

    const user = result.user;
    if (!user) {
        res.status(500).send({ error: 'Database Query Error' });
        return;
    }

    res.status(200).json({
        data: {
            accessToken: user.accessToken,
            user: {
                id: user._id,
                provider: user.provider,
                name: user.name,
                email: user.email,
                picture: user.picture,
            },
        },
    });
};

const getUserProfile = async (req, res) => {
    const result = await User.getUserProfile(req.user.userId);

    modelResultResponder(result, res);
};

const updateUserProfile = async (req, res) => {
    const { userId } = req.user;
    const updateInfo = {};

    // TODO: Verify updated info
    for (let field in req.body) {
        if (!['name', 'bio', 'picture'].includes(field)) {
            res.status(400).json({ error: `Invalid updated field ${field}.` });
            return;
        }

        updateInfo[field] = req.body[field];
        if (['name', 'picture'].includes(field) && !updateInfo[field]) {
            res.status(400).json({ error: "Name or picture can't be empty." });
            return;
        }
    }

    if (Object.keys(updateInfo).length == 0) {
        res.status(400).json({ error: 'No updated info.' });
        return;
    }

    const result = await User.updateUserProfile(userId, updateInfo);

    modelResultResponder(result, res);
};

const follow = async (req, res) => {
    const { followerId } = req.body;
    const { userId } = req.user;
    const io = req.app.get('socketio');

    if (!followerId) {
        res.status(400).json({ error: 'FollowerId is required.' });
        return;
    }
    const result = await User.follow(userId, followerId);

    if (result.data) {
        Notification.pushFollowNotification(userId, followerId, io);
    }

    modelResultResponder(result, res);
};

const unfollow = async (req, res) => {
    const { followerId } = req.body;
    const { userId } = req.user;
    const io = req.app.get('socketio');

    if (!followerId) {
        res.status(400).json({ error: 'followerId is required' });
        return;
    }

    const result = await User.unfollow(userId, followerId);

    if (result.data) {
        Notification.pullFollowNotification(followerId, userId, io);
    }

    modelResultResponder(result, res);
};

const subscribe = async (req, res) => {
    const { userId } = req.user;
    const newSubscribe = req.body;

    // validate category and weight
    if (!newSubscribe) {
        res.status(400).json({ error: 'category and weightis required in subscription object' });
        return;
    }

    // examine whether the weight value is integer between 1 to 10
    const weights = Object.values(newSubscribe).map((weight) => parseInt(weight));
    for (let i = 0; i < weights.length; i++) {
        if (isNaN(weights[i]) || weights[i] < 1 || weights[i] > 10) {
            res.status(400).json({ error: 'weight value should be between 1 to 10.' });
            return;
        }
    }

    const result = await User.subscribe(userId, newSubscribe);

    modelResultResponder(result, res);
};

const favorite = async (req, res) => {
    const { userId } = req.user;
    const { articleId } = req.body;

    if (!articleId) {
        res.status(400).json({ error: 'articleId is required.' });
        return;
    }

    const result = await User.favorite(userId, articleId);

    modelResultResponder(result, res);
};

const unfavorite = async (req, res) => {
    const { articleId } = req.body;
    const { userId } = req.user;

    if (!articleId) {
        res.status(400).json({ error: 'ArticleId is required.' });
        return;
    }

    const result = await User.unfavorite(userId, articleId);

    modelResultResponder(result, res);
};

const getSubscription = async (req, res) => {
    const { userId } = req.user;

    const result = await User.getSubscription(userId);

    modelResultResponder(result, res);

    return;
};

const getAuthorProfile = async (req, res) => {
    const { id: authorId } = req.params;

    const result = await User.getAuthorProfile(authorId);

    modelResultResponder(result, res);
};

const getUploadAvatarUrl = async (_, res) => {
    try {
        const { uploadURL, imageName } = await generateUploadURL('avatar/');
        res.status(200).json({ data: { uploadURL, avatarName: imageName, avatarURL: process.env.IMAGE_URL + '/avatar/' + imageName } });
    } catch (error) {
        console.error(error);
        res.status('500').json({ error: 'Server error' });
    }
};

module.exports = {
    getUserProfile,
    getAuthorProfile,
    updateUserProfile,
    signUp,
    validateEmil,
    signIn,
    follow,
    unfollow,
    subscribe,
    favorite,
    unfavorite,
    getUserInfo,
    getSubscription,
    getUploadAvatarUrl,
};
