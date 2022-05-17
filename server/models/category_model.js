const { Category } = require(`${__dirname}/schemas`);

const verifyCategories = async (categories) => {
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
            return { error: `Invalid category ${cat}` };
        }
    }
    return { data: true };
};

module.exports = { verifyCategories };
