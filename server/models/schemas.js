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
    picture: String,
    provider: {
        type: String,
        default: 'native',
    },
    follower: [mongoose.SchemaTypes.ObjectId],
    followee: [mongoose.SchemaTypes.ObjectId],
    favorite: [mongoose.SchemaTypes.ObjectId],
    subscribe: Object,
});

const commentSchema = mongoose.Schema({
    context: String,
    createdAt: {
        type: Date,
        immutable: true,
    },
    reader: {
        type: mongoose.SchemaTypes.ObjectId,
        ref: 'User',
    },
    authorReply: {
        context: String,
        createdAt: {
            type: Date,
            immutable: true,
        },
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
    context: {
        type: String,
        required: true,
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
});

articleSchema.index({ title: 1, author: 1 }, { unique: true });

module.exports = {
    User: mongoose.model('User', userSchema, 'User'),
    Article: mongoose.model('Article', articleSchema, 'Article'),
    ObjectId: mongoose.Types.ObjectId,
};
