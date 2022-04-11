require('dotenv').config();

const { PORT: port, NODE_ENV } = process.env;

const express = require('express');
const app = express();
const cors = require('cors');

app.set('trust proxy', true);
app.set('json spaces', 2);

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// API routes
app.use('/api', [require('./server/routes/user_route')]);

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
    app.listen(port, async () => {
        console.log(`Listening on port: ${port}`);
    });
}
