const { User } = require('../server/models/schemas');
const bcrypt = require('bcrypt');

async function run() {
    await User.deleteMany({});

    for (let i = 1; i < 31; i++) {
        const name = `Tester-${i}`;

        const picNum = Math.floor(Math.random() * 9);

        const userInfo = {
            name,
            email: `${name}@appwork.com`,
            password: bcrypt.hashSync(name, 10),
            picture: `default-${picNum}.jpg`,
        };

        const user = await User.create(userInfo);
        console.log(`${i} user created!`);
    }
}

run();
