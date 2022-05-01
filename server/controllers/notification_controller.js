const Notification = require('../models/notification_model');

const getUnreadCount = async (req, res) => {
    const { data, error, status } = await Notification.getUnreadCount(req.user.userId);

    if (error) {
        res.status(status).json({ error });
    }

    res.status(200).json({ data });
};

module.exports = {
    getUnreadCount,
};
