/* eslint-disable no-undef */
require('dotenv').config({ path: `${__dirname}/../.env` });
const { User } = require(`${__dirname}/../server/models/schemas.js`);
const user_model = require(`${__dirname}/../server/models/user_model.js`);
var assert = require('chai').assert;
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const { TOKEN_SECRET } = process.env;

describe('User model unit test', function () {
    before((done) => {
        setTimeout(() => {
            done();
        }, 500);
    });

    after(async function () {
        await User.findByIdAndDelete(MochaTester._id);
    });

    let MochaTester;

    let MochaTesterInfo = {
        name: 'MochaTester',
        email: '40243105s@gmail.com',
        password: 'password',
    };

    let emailToken;

    describe('[ User Signup ]', function () {
        it('Valid Registered', async function () {
            const { name, email, password } = MochaTesterInfo;
            const { data } = await user_model.signUp(name, email, password);
            MochaTester = data.user;
            emailToken = data.emailValidationToken;

            const expect = { name: 'MochaTester', email: '40243105s@gmail.com', role: 2, bio: '', provider: 'native', valid: false };

            assert.deepInclude(MochaTester, expect, 'Basic user Signup Detail');
            assert.deepEqual(MochaTester.subscribe, {}, 'Empty subscribe object');
            assert.isArray(MochaTester.follower, 'Empty follower array');
            assert.lengthOf(MochaTester.follower, 0, 'Empty follower array');
            assert.isArray(MochaTester.followee, 'Empty followee array');
            assert.lengthOf(MochaTester.followee, 0, 'Empty followee array');
        });

        it('Email Already Registered condition', async function () {
            const { name, email, password } = MochaTesterInfo;
            const result = await user_model.signUp(name, email, password);

            assert.deepEqual(result, { error: 'Email already registered.', status: 403 }, 'Registered email error.');
        });
    });

    describe('[ Email Validation ]', function () {
        it('Email Validation', async function () {
            const { data: name } = await user_model.validateEmailToken(emailToken);
            assert.equal(MochaTesterInfo.name, name, 'Legal Validation should return user name as data.');
        });

        it('Unauthorized token', async function () {
            const { _id, name, provider } = MochaTester;
            const fakeToken = jwt.sign(
                {
                    userId: _id.toString(),
                    provider,
                    name,
                    timestamp: new Date().toISOString(),
                },
                'FAKE'
            );

            const validateResult = await user_model.validateEmailToken(fakeToken);
            assert.deepEqual(validateResult, { status: 401, error: 'Unauthorized.' }, 'Fake token should return unauthorized error.');
        });

        it('Expired token', async function () {
            const { _id, name, provider } = MochaTester;
            let timestamp_10_min_before = new Date().getTime() - 1000 * 60 * 10;
            const expiredToken = jwt.sign({ userId: _id.toString(), provider, name, timestamp: new Date(timestamp_10_min_before).toISOString() }, TOKEN_SECRET);

            const validateResult = await user_model.validateEmailToken(expiredToken);
            assert.deepEqual(validateResult, { status: 401, error: 'Token expired.' }, 'Expired token.');
        });
    });

    describe('[ User Sign in ]', function () {
        it('Unregistered Email', async function () {
            const signInRetult = await user_model.nativeSignIn('44444444@gmail.com');
            assert.deepEqual(signInRetult, { error: 'Unregistered.', status: 401 }, 'Return Email unregistered error.');
        });

        it('Wrong Password', async function () {
            const signInRetult = await user_model.nativeSignIn('40243105s@gmail.com', 'PASSWORD');
            assert.deepEqual(signInRetult, { error: 'Unauthorized.', status: 401 }, 'Wrong password error.');
        });

        it('Unverified account', async function () {
            await User.findByIdAndUpdate(MochaTester._id, { $set: { valid: false } });

            const signInRetult = await user_model.nativeSignIn('40243105s@gmail.com', 'password');
            assert.deepEqual(signInRetult, { error: 'Unauthorized.', status: 401 }, 'User yet pass the email validation.');
        });

        it('Valid Sign in', async function () {
            await User.findByIdAndUpdate(MochaTester._id, { $set: { valid: true } });
            const {
                data: { user, accessToken },
            } = await user_model.nativeSignIn('40243105s@gmail.com', 'password');

            const { _id, provider, name, email, picture } = MochaTester;
            const expectedUser = { userId: _id.toString(), provider, name, email, picture };

            assert.deepEqual(user, expectedUser, 'User info verification');

            const userFromToken = await promisify(jwt.verify)(accessToken, TOKEN_SECRET);
            delete userFromToken.iat;
            assert.deepEqual(userFromToken, expectedUser, 'Extract user info from verified JWT');
        });
    });

    describe('[ validAndExist ]', function () {
        const inValidIdError = { error: 'Invalid userId.', status: 400 };

        it('User exist scenario', async function () {
            const result = await user_model.validAndExist(MochaTester._id.toString());
            assert.deepEqual(result, { data: MochaTester._id.toString() }, 'Return the query id that exists.');
        });

        it("User doesn't exist scenario", async function () {
            let fakeId = '';

            for (let letter of MochaTester._id.toString()) {
                if (!isNaN(parseInt(letter))) {
                    fakeId += (parseInt(letter) + 1) % 10;
                } else {
                    fakeId += letter;
                }
            }

            const result = await user_model.validAndExist(fakeId);
            assert.deepEqual(result, inValidIdError, "Fake random Id shouldn't exist.");
        });

        it('Invalid userId error', async function () {
            let extraLetter = MochaTester._id.toString() + '5';
            let lackLetter = MochaTester._id.toString().slice(0, -1);

            let extraLetterResult = await user_model.validAndExist(extraLetter);
            let lackLetterResult = await user_model.validAndExist(lackLetter);

            assert.deepEqual(extraLetterResult, inValidIdError, 'Invalid Object id error for extra letter');
            assert.deepEqual(lackLetterResult, inValidIdError, 'Invalid Object id error for extra letter');
        });
    });
});
