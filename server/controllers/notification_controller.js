const Notification = require('../models/notification_model');
const { modelResultResponder } = require(`${__dirname}/../../util/util`);

const getUnreadCount = async (req, res) => {
    const result = await Notification.getUnreadCount(req.user.userId);

    modelResultResponder(result, res);
};

const getNotifications = async (req, res) => {
    let { offset } = req.params;
    offset = parseInt(offset);

    if (isNaN(offset) || offset < 0) {
        res.status(400).json({ error: 'Invalid offset.' });
        return;
    }

    const { data, error, status } = await Notification.getNotifications(req.user.userId, offset);

    if (error) {
        res.status(status).json({ error });
    }

    res.status(200).json({ data });
};

module.exports = {
    getUnreadCount,
    getNotifications,
};
