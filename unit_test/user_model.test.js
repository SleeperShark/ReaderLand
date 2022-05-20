require('dotenv').config({ path: `${__dirname}/../.env` });
const { User, ObjectId } = require(`${__dirname}/../server/models/schemas.js`);
const user_model = require(`${__dirname}/../server/models/user_model.js`);
var assert = require('chai').assert;
const jwt = require('jsonwebtoken');
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

    describe('User Signup', function () {
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

        // it('Login before email registration', async function () {
        //     const { email, password } = MochaTesterInfo;
        //     const signInResult = await user_model.nativeSignIn(email, password);

        //     assert.deepEqual(signInResult, { error: 'Unauthorized.', status: 401 }, "User can't login before email validation.");
        // });

        // it('Login after registration', async function () {
        //     const { email, password, name } = MochaTesterInfo;
        //     const {
        //         data: { accessToken, user },
        //     } = await user_model.nativeSignIn(email, password);

        //     loginToken = accessToken;

        //     assert.deepInclude(user, { provider: 'native', name, email }, 'User Info validation.');
        //     assert(ObjectId.isValid(user.id), 'User id validation');
        // });
    });

    describe('Email Validation', function () {
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

    describe('validAndExist', function () {
        const inValidIdError = { error: 'Invalid userId.', status: 400 };

        before(async function () {
            fakeUser = await User.create({ name: 'Mocha', email: 'Mocha@ReaderLand.com', bio: 'Testing before()' });
        });

        after(async function () {
            await User.findByIdAndDelete(fakeUser._id);
        });

        it('User exist scenario', async function () {
            const result = await user_model.validAndExist(fakeUser._id.toString());
            assert.deepEqual(result, { data: fakeUser._id.toString() }, 'Return the query id that exists.');
        });

        it("User doesn't exist scenario", async function () {
            let fakeId = '';

            for (let letter of fakeUser._id.toString()) {
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
            let extraLetter = fakeUser._id.toString() + '5';
            let lackLetter = fakeUser._id.toString().slice(0, -1);

            let extraLetterResult = await user_model.validAndExist(extraLetter);
            let lackLetterResult = await user_model.validAndExist(lackLetter);

            assert.deepEqual(extraLetterResult, inValidIdError, 'Invalid Object id error for extra letter');
            assert.deepEqual(lackLetterResult, inValidIdError, 'Invalid Object id error for extra letter');
        });
    });
});
