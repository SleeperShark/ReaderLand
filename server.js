require('dotenv').config();

if (process.env.NODE_ENV == 'production') {
    const app = require('./app');
    const mongoose = require('mongoose');
    const { MONGO_USER, MONGO_PASSWORD, MONGO_DATABASE, port } = process.env;
    const connectURL = `mongodb+srv://${MONGO_USER}:${MONGO_PASSWORD}@readerland.uebkf.mongodb.net/${MONGO_DATABASE}?retryWrites=true&w=majority`;

    mongoose
        .connect(connectURL)
        .then(() => {
            console.log('MongoDB connected...');
            app.listen(port, () => {
                console.log(`Server runing on port ${port}`);
            });
        })
        .catch((error) => {
            console.error('ERROR: MongoDB connection failed...');
            console.error(error);
        });
}
