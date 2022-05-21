require('dotenv').config({ path: `${__dirname}/../../.env` });
const validator = require('validator');
const User = require('../models/user_model');
const Category = require(`${__dirname}/../models/category_model`);
const Article = require(`${__dirname}/../models/article_model`);
const { generateUploadURL, validationEmail, modelResultResponder } = require(`${__dirname}/../../util/util`);
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
        res.status(500).json({ error: 'Server Error' });
        return;
    }

    // TODO: timeout for unvalidated account after 10 min
    const removeUserTimeout = setTimeout(async () => {
        try {
            console.log('Deleting unvalidating account...');
            await User.deleteUser(user._id);
            await Notification.deleteUserNotification(user._id);
        } catch (error) {
            console.error('[Error] removeUserTimeout');
            console.error(error);
        }
    }, 1000 * 60 * 10);

    try {
        //TODO: sending Validation email
        await validationEmail({
            email,
            validationToken: emailValidationToken,
        });

        //TODO: init Notification document
        await Notification.initUserNotification(user._id);
    } catch (_) {
        console.log('Error in initiating, removing user from db...');
        clearTimeout(removeUserTimeout);

        await User.deleteUser(user._id);
        await Notification.deleteUserNotification(user._id);
        res.status(500).json({ error: 'Server error' });
        return;
    }

    return res.status(200).json({ data: { user: { userId: user._id, name: user.name, email: user.email } } });
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

const signIn = async (req, res) => {
    const { provider, email, password } = req.body;

    if (!provider || !email || !password) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    let result;

    switch (provider) {
        case 'native':
            result = await User.nativeSignIn(email, password);
            break;
        // case 'facebook':
        //     result = await facebookSignIn(data.access_token);
        //     break;
        default:
            result = { error: 'Invalid signin request', status: 400 };
    }

    modelResultResponder(result, res);
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

    // check if userId equals to follower
    if (userId.toString() === followerId) {
        console.log("User can't be follower itself");
        res.status(400).json({ error: "User can't be follower itself", status: 400 });
        return;
    }

    const validUserResult = await User.validAndExist(followerId);
    if (validUserResult.error) {
        modelResultResponder(validUserResult);
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

    if (userId.toString() === followerId) {
        res.status(400).json({ error: "User can't be follower itself" });
        return;
    }

    const validUserResult = await User.validAndExist(followerId);
    if (validUserResult.error) {
        modelResultResponder(validUserResult);
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

    const verifyResult = await Category.verifyCategories(Object.keys(newSubscribe));
    if (verifyResult.error) {
        modelResultResponder(verifyResult, res);
        return;
    }

    const updateResult = await User.subscribe(userId, newSubscribe);
    if (updateResult.error) {
        modelResultResponder(updateResult, res);
        return;
    }

    // Regenerate newsfeed
    if (updateResult.data.preference) {
        Article.generateNewsFeedInCache({ userId, preference: updateResult.data.preference });
        updateResult.data = updateResult.data.preference.subscribe;
    }

    modelResultResponder(updateResult, res);
};

const favorite = async (req, res) => {
    const { userId } = req.user;
    const { articleId } = req.body;

    if (!articleId) {
        res.status(400).json({ error: 'articleId is required.' });
        return;
    }

    const { error, status } = await Article.validAndExist(articleId);
    if (error) {
        res.status(status).json({ error });
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

    const { error, status } = await Article.validAndExist(articleId);
    if (error) {
        res.status(status).json({ error });
        return;
    }

    const result = await User.unfavorite(userId, articleId);

    modelResultResponder(result, res);
};

const getSubscription = async (req, res) => {
    const { userId } = req.user;

    const result = await User.getUserInfoFields(userId, ['subscribe']);
    if (result.data) {
        result.data = result.data.subscribe;
    }

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
