require('dotenv').config();
const { socketAuthentication } = require(`${__dirname}/server/models/user_model`);
const Notification = require(`${__dirname}/server/models/notification_model`);
const Cache = require('./util/cache');

const { PORT: port, NODE_ENV } = process.env;

const express = require('express');
const app = express();
const cors = require('cors');

// Setting server for socketio
const server = require('http').createServer(app);

app.set('trust proxy', true);
app.set('json spaces', 2);

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Setting Socket middleware
var io = require('socket.io')(server);

// for updating notification
io.usersId_socketId = {};
// for updating article feedback
io.articleId_socketId = {};

io.use(socketAuthentication()).on('connection', (socket) => {
    console.log(`Socket ${socket.id} is connected..`);
    io.usersId_socketId[socket.userId] = socket.id;

    //TODO: return 10 more notification from offset
    socket.on('fetch-notification', async (msg) => {
        const { loadedNotification } = JSON.parse(msg);
        console.log('fetch-notification: ' + loadedNotification);

        const notifications = await Notification.getNotifications(socket.userId, loadedNotification);

        io.to(socket.id).emit('notifcations', JSON.stringify(notifications));
    });

    //TODO: clear unread count
    socket.on('clear-unread', async (msg) => {
        console.log(`clearing unread record for user ${socket.userId}...`);
        const { clearNum } = JSON.parse(msg);

        await Notification.clearUnread(socket.userId, clearNum);
    });

    socket.on('article-register', (msg) => {
        const { articleId } = JSON.parse(msg);
        console.log(`Socket ${socket.id} join ${articleId} room...`);
        socket.join(articleId);
    });

    socket.on('disconnect', () => {
        console.log(`${socket.id} is offline...`);
        delete io.usersId_socketId[socket.userId];
    });
});
app.set('socketio', io);

// TODO: server routing

app.get('/test', (req, res) => {
    console.log('test');
    res.status(200).json({ data: 'ok' });
});

// API routes
app.use('/api', [
    require('./server/routes/user_route'),
    require('./server/routes/article_route'),
    require('./server/routes/draft_route'),
    require('./server/routes/notification_route'),
]);

// Page not found
app.use((req, res, next) => {
    res.status(404).sendFile(__dirname + '/public/404.html');
    return;
});

// Error handling
app.use((err, req, res, next) => {
    console.log(err);
    res.status(500).json({ error: 'Internal Server Error' });
});

if (NODE_ENV != 'production') {
    server.listen(port, async () => {
        Cache.connect().catch(() => {
            console.log('Redis connect fail...');
        });
        console.log(`Listening on port: ${port}`);
    });
}
