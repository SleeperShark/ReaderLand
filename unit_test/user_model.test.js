const { User } = require(`${__dirname}/../server/models/schemas.js`);
const user_model = require(`${__dirname}/../server/models/user_model.js`);
var assert = require('chai').assert;

describe('User model unit test', function () {
    describe('validAndExist', function () {
        let fakeUser;

        before(async function () {
            fakeUser = await User.create({ name: 'Mocha', email: 'Mocha@ReaderLand.com', bio: 'Testing before()' });
        });

        after(async function () {
            await User.findByIdAndDelete(fakeUser._id);
        });

        it('User exist scenario', async function () {
            const { data: userId } = await user_model.validAndExist(fakeUser._id.toString());
            assert.equal(userId, fakeUser._id.toString(), 'fake User should be in db.');
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

            const { status: InvalidErrorStatus } = await user_model.validAndExist(fakeId);
            assert.equal(InvalidErrorStatus, 400, "Fake random Id shouldn't exist.");
        });

        it('Invalid userId error', async function () {
            let extraLetter = fakeUser._id.toString() + '5';
            let lackLetter = fakeUser._id.toString().slice(0, -1);

            let { status: extraErrorStatus } = await user_model.validAndExist(extraLetter);
            let { status: lackErrorStatus } = await user_model.validAndExist(lackLetter);

            assert.equal(extraErrorStatus, 400, 'Invalid Object id error for extra letter');
            assert.equal(lackErrorStatus, 400, 'Invalid Object id error for lacking letter');
        });
    });
});
