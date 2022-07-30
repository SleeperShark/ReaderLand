require('dotenv').config({ path: `${__dirname}/../../.env` });
const mongoose = require('mongoose');

const { NODE_ENV, MONGO_USER, MONGO_PASSWORD, MONGO_DATABASE } = process.env;

let connectURL;
switch (NODE_ENV) {
    case 'test':
        connectURL = 'mongodb://localhost:27017/ReaderLand';
        break;
    case 'development':
        connectURL = `mongodb+srv://${MONGO_USER}:${MONGO_PASSWORD}@readerland.uebkf.mongodb.net/${MONGO_DATABASE}?retryWrites=true&w=majority`;
        break;
    case 'production':
        connectURL = `mongodb+srv://${MONGO_USER}:${MONGO_PASSWORD}@readerland.uebkf.mongodb.net/${MONGO_DATABASE}?retryWrites=true&w=majority`;
        break;
    case 'docker':
        connectURL = `mongodb+srv://${MONGO_USER}:${MONGO_PASSWORD}@readerland.uebkf.mongodb.net/${MONGO_DATABASE}?retryWrites=true&w=majority`;
        break;
    default:
        connectURL = `mongodb+srv://${MONGO_USER}:${MONGO_PASSWORD}@readerland.uebkf.mongodb.net/${MONGO_DATABASE}?retryWrites=true&w=majority`;
        break;
}

mongoose.connect(
    connectURL,
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

const NotificationSchema = mongoose.Schema({
    _id: {
        type: mongoose.SchemaTypes.ObjectId,
        ref: 'User',
    },
    notifications: [Object],
    unread: {
        type: Number,
        default: 0,
    },
});

module.exports = {
    User: mongoose.model('User', userSchema, 'User'),
    Article: mongoose.model('Article', articleSchema, 'Article'),
    Category: mongoose.model('Category', categorySchema, 'Category'),
    Draft: mongoose.model('Draft', draftSchema, 'Draft'),
    Notification: mongoose.model('Notification', NotificationSchema, 'Notification'),
    ObjectId: mongoose.Types.ObjectId,
};
