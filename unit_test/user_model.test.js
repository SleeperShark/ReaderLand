const { User } = require(`${__dirname}/../server/models/schemas.js`);
const user_model = require(`${__dirname}/../server/models/user_model.js`);
var assert = require('chai').assert;

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

    describe('User Registration', function () {
        let emailToken;

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

        it('Login before email registration', async function () {
            const { email, password } = MochaTesterInfo;
            const signInResult = await user_model.nativeSignIn(email, password);

            assert.deepEqual(signInResult, { error: 'Unauthorized.', status: 401 }, "User can't login before email validation.");
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
