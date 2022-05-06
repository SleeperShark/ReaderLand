require('dotenv').config();
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
io.on('connection', (socket) => {
    console.log(`Socket ${socket.id} is connected..`);
    socket.emit('Hello', 'World');

    socket.on('disconnect', () => {
        console.log(`${socket.id} is offline...`);
    });

    socket.on('fetch-notification', (msg) => {
        console.log('fetch-notification');
        const { id, loadedNotification } = JSON.parse(msg);
        console.log(`${id}-notification`);
        io.emit(`${id}-notify`, '{data: "test"}');
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
