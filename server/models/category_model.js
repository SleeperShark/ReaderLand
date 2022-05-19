const { Category } = require(`${__dirname}/schemas`);

const verifyCategories = async (categories) => {
    try {
        const validCategories = (await Category.find({})).map((elem) => elem.category);

        for (let cat of categories) {
            let valid = false;

            for (let validCat of validCategories) {
                if (validCat == cat) {
                    valid = true;
                    break;
                }
            }

            if (!valid) {
                return { error: `Invalid category ${cat}`, status: 400 };
            }
        }
        return { data: true };
    } catch (error) {
        console.error('[ERROR] verifyCategories');
        console.error(error);
        return { error: 'Server error', status: 500 };
    }
};

module.exports = { verifyCategories };
