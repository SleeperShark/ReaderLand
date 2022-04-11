require('dotenv').config();
const validator = require('validator');
const User = require('../models/user_models');

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

    const result = await User.signUp(name, email, password);
    if (result.error) {
        res.status(403).json({ error: result.error.message });
        return;
    }

    const user = result.user;
    if (!user) {
        res.status(500).json({ error: 'Database Query Error' });
        return;
    }

    res.status(200).json({
        data: { user: { id: user._id, name: user.name, email: user.email } },
    });
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

module.exports = {
    signUp,
    signIn,
};
