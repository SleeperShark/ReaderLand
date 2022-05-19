const { User, ObjectId } = require(`${__dirname}/../server/models/schemas.js`);
const user_model = require(`${__dirname}/../server/models/user_model.js`);
var assert = require('chai').assert;

// describe('userExist', () => {});

describe('userExist function', function () {
    let fakeUser;

    before(async function () {
        fakeUser = await User.create({ name: 'Mocha', email: 'Mocha@ReaderLand.com', bio: 'Testing before()' });
    });

    after(async function () {
        await User.findByIdAndDelete(fakeUser._id);
    });

    it('User exist scenario', async function () {
        const exist = await user_model.userExist(fakeUser._id.toString());
        assert.equal(exist, true, 'fake User should be in db.');
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

        const exist = await user_model.userExist(fakeId);
        assert.equal(exist, null, "Fake random Id shouldn't exist.");
    });

    it('Invalid userId error', async function () {
        let extraLetter = fakeUser._id.toString() + '5';
        let lackLetter = fakeUser._id.toString().slice(0, -1);

        let extraExist = await user_model.userExist(extraLetter);
        let lackExist = await user_model.userExist(lackLetter);

        console.log(extraExist);
        console.log(lackExist);
    });
});
