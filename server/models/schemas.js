const mongoose = require('mongoose');

mongoose.connect(
    'mongodb://localhost/ReaderLand',
    () => {
        console.log('MongoDB is connected...');
    },
    (e) => {
        console.error(e);
    }
);

const userSchema = mongoose.Schema({
    name: String,
    role: {
        type: Number,
        default: 2,
    }, // ADMIN: 1, USER: 2
    valid: {
        // pass email validation or not
        type: Boolean,
        default: false,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    createdAt: {
        type: Date,
        immutable: true,
        default: new Date().toISOString(),
    },
    password: String,
    picture: {
        type: String,
        default: 'default-0.jpg',
    },
    provider: {
        type: String,
        default: 'native',
    },
    follower: [mongoose.SchemaTypes.ObjectId],
    followee: [mongoose.SchemaTypes.ObjectId],
    favorite: [
        {
            articleId: {
                type: mongoose.SchemaTypes.ObjectId,
                ref: 'Article',
            },
            createdAt: {
                type: Date,
                immutable: true,
            },
            _id: false,
        },
    ],
    subscribe: Object,
    bio: String,
});

const commentSchema = mongoose.Schema({
    context: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        reqired: true,
        immutable: true,
    },
    reader: {
        type: mongoose.SchemaTypes.ObjectId,
        ref: 'User',
        required: true,
    },
    authorReply: Object,
});

const categorySchema = mongoose.Schema({
    category: {
        type: String,
        required: true,
        unique: true,
    },
});

const articleSchema = mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    author: {
        type: mongoose.SchemaTypes.ObjectId,
        ref: 'User ',
        required: true,
    },
    context: Object,
    preview: {
        type: String,
        maxLength: 150,
    },
    createdAt: {
        type: Date,
        immutable: true,
        default: new Date().toISOString(),
    },
    readCount: {
        type: Number,
        default: 0,
    },
    likes: [mongoose.SchemaTypes.ObjectId],
    comments: [commentSchema],
    category: [String],
    head: String,
});

// articleSchema.index({ title: 1, author: 1 });

const draftSchema = mongoose.Schema({
    title: String,
    author: {
        type: mongoose.SchemaTypes.ObjectId,
        required: true,
        index: true,
    },
    context: Object,
    head: {
        type: String,
        require: true,
    },
    createdAt: {
        type: Date,
        immutable: true,
        required: true,
    },
    lastUpdatedAt: Date,
});

module.exports = {
    User: mongoose.model('User', userSchema, 'User'),
    Article: mongoose.model('Article', articleSchema, 'Article'),
    Category: mongoose.model('Category', categorySchema, 'Category'),
    Draft: mongoose.model('Draft', draftSchema, 'Draft'),
    ObjectId: mongoose.Types.ObjectId,
};
