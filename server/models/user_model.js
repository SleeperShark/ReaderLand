require('dotenv').config();
const { User, ObjectId, Category } = require('./schemas');
const salt = parseInt(process.env.BCRYPT_SALT);
const { TOKEN_SECRET } = process.env;
const bcrypt = require('bcrypt');
const hashAsync = require('util').promisify(bcrypt.hash);
const comapreAsync = require('util').promisify(bcrypt.compare);
const jwt = require('jsonwebtoken');

const USER_ROLE = {
    ALL: -1,
    ADMIN: 1,
    USER: 2,
};

const signUp = async (name, email, password) => {
    try {
        const userInfo = {
            name,
            email,
            role: USER_ROLE.USER,
            password: await hashAsync(password, salt),
        };

        const user = await User.create(userInfo);
        await user.save();
        console.log(`A new user ${user.name} has registered!`);

        return { user };
    } catch (error) {
        console.error(error);
        return { error };
    }
};

const nativeSignIn = async (email, password) => {
    try {
        const modelUser = await User.findOne({ email });
        const user = JSON.parse(JSON.stringify(modelUser));

        if (!(await comapreAsync(password, user.password))) {
            return { error: 'Password is wrong' };
        }

        const accessToken = jwt.sign(
            {
                provider: user.provider,
                name: user.name,
                email: user.email,
                picture: user.picture,
            },
            TOKEN_SECRET
        );

        user.accessToken = accessToken;

        return { user };
    } catch (error) {
        console.error(error);
        return { error };
    }
};

const getUserDetail = async (email, roleId) => {
    try {
        if (roleId) {
            return { user: await User.findOne({ email, role: roleId }) };
        } else {
            return { user: await User.findOne({ email }) };
        }
    } catch (error) {
        console.error(error);
        return { error: error.message };
    }
};

const follow = async (userId, followerId) => {
    // check if userId equals to follower
    if (userId.toString() === followerId) {
        return { error: "User can't be follower itself", status: 400 };
    }

    // validate whether followerId match BSON format
    try {
        followerId = ObjectId(followerId);
    } catch (error) {
        return { error: 'followerId format error', status: 400 };
    }

    try {
        // check if followe exist
        let exist = await User.countDocuments({ _id: followerId });
        if (!exist) {
            return { error: "FollowerId doesn't exist.", status: 400 };
        }

        // push followerId to user's follower array
        // check if already follow
        const follow = await User.countDocuments({ _id: userId, follower: { $elemMatch: { $eq: followerId } } });
        if (!follow) {
            // not exist => push followerId to user's follower array
            await User.findByIdAndUpdate(userId, { $push: { follower: followerId } });
            console.log("Update user's follower list.");
        } else {
            console.log('This follower is already in follower list.');
        }

        // push userId to follower's followee array
        // check if already followed
        let followed = await User.countDocuments({ _id: followerId, followee: { $elemMatch: { $eq: userId } } });
        if (!followed) {
            // not exist => push userId to follower's followee list
            await User.findByIdAndUpdate(followerId, { $push: { followee: userId } });
            console.log("Update follower's folowee list.");
        } else {
            console.log('This followee is already in followee list.');
        }

        return { follow: 1 };
    } catch (error) {
        console.error(error);
        return { error: 'Server Error', status: 500 };
    }
};

const unfollow = async (userId, followerId) => {
    // check if userId equals to follower
    if (userId.toString() === followerId) {
        return { error: "User can't be follower itself", status: 400 };
    }

    // validate whether followerId follow the BSON format
    try {
        followerId = ObjectId(followerId);
    } catch (error) {
        return { error: 'followerId format error', status: 400 };
    }

    try {
        // remove followerId from user's follower list
        await User.findByIdAndUpdate(userId, { $pull: { follower: followerId } });
        console.log("Remove followerId from user's follower list...");

        // remove userId from follower's followee list
        await User.findByIdAndUpdate(followerId, { $pull: { followee: userId } });
        console.log("Remove userId from follower's followee list...");
    } catch (error) {
        console.error(error);
        return { status: 500, error: 'Server error' };
    }
    return { unfollow: 1 };
};

const subscribe = async (userId, category, weight) => {
    try {
        // verify if category in Cateogry schema
        const catExist = await Category.countDocuments({ category });
        if (!catExist) {
            return { error: `category ${category} doesn't exist.`, status: 400 };
        }

        // retrieve user's subscribe object
        let subscription = (await User.findById(userId, { _id: 0, subscribe: 1 }))['subscribe'] || {};
        subscription[category] = weight;

        await User.findByIdAndUpdate(userId, { subscribe: subscription });
        console.log(`Successfully update user's subscription with new category ${category}:${weight}...`);
        return { subscribe: 1 };
    } catch (error) {
        console.error(error);
        return { error: 'Server error', status: 500 };
    }
};

const unsubscribe = async (userId, category) => {
    try {
        let subscription = await User.findById(userId, { subscribe: 1, _id: 0 });
        subscription = subscription.subscribe;
        delete subscription[category];

        await User.findByIdAndUpdate(userId, { subscribe: subscription });
        console.log(`Successfully unsubscribe the category ${category}...`);

        return { unsubscribe: 1 };
    } catch (error) {
        console.error(error);
        return { error: 'Server error', status: 500 };
    }
};

module.exports = {
    USER_ROLE,
    nativeSignIn,
    signUp,
    getUserDetail,
    follow,
    unfollow,
    subscribe,
    unsubscribe,
};
