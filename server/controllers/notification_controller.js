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

    const result = await Notification.getNotifications(req.user.userId, offset);

    modelResultResponder(result, res);
};

module.exports = {
    getUnreadCount,
    getNotifications,
};
