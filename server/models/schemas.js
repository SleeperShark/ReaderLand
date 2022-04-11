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
    role: Number, // ADMIN: 1, USER: 2
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
    favorite_articles: [mongoose.SchemaTypes.ObjectId],
    subscribe_category: [String],
});

const commentSchema = mongoose.Schema({
    context: String,
    createdTime: {
        type: Date,
        immutable: true,
    },
    reader: {
        type: mongoose.SchemaTypes.ObjectId,
        ref: 'User',
    },
    authorReply: {
        context: String,
        createdTime: {
            type: Date,
            immutable: true,
        },
    },
});

const articleSchema = mongoose.Schema({
    title: String,
    author: {
        type: mongoose.SchemaTypes.ObjectId,
        ref: 'User ',
    },
    context: String,
    created_time: Date,
    readCount: Number,
    likes: [mongoose.SchemaTypes.ObjectId],
    comments: [commentSchema],
});

module.exports = {
    User: mongoose.model('User', userSchema, 'User'),
};
