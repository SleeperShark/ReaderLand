const { User } = require('../server/models/schemas');
const bcrypt = require('bcrypt');

async function run() {
    for (let i = 1; i < 51; i++) {
        const name = `Tester-${i}`;
        const userInfo = {
            name,
            email: `${name}@appwork.com`,
            password: bcrypt.hashSync(name, 10),
        };

        const user = await User.create(userInfo);
        console.log(`${i} user created!`);
    }
}

run();
