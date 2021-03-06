const { Category } = require(`${__dirname}/schemas`);

const getCategories = async () => {
    try {
        const result = await Category.find({}, { category: 1, _id: 0 });
        const categories = result.map((elem) => elem.category.toString());

        return { data: categories };
    } catch (error) {
        console.error('[ERROR] getCategories');
        console.error(error);
        return { error: 'Server Error.', status: 500 };
    }
};

const validAndExist = async (category) => {
    try {
        const exist = await Category.findOne({ category });
        if (!exist) {
            return { error: 'Unmatched Category.', status: 400 };
        }
        return { data: category };
    } catch (error) {
        console.error('[ERROR] validAndExist');
        console.error(error);
        return { error: 'Server error', status: 500 };
    }
};

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

module.exports = { verifyCategories, validAndExist, getCategories };
