const fetchHandler = async (url, init = { method: 'GET', headers: {} }) => {
    init.headers['Content-Type'] = 'Application/json';

    try {
        let res = await fetch(url, init);
        let status = res.status;
        res = await res.json();

        if (status == 200) {
            return { data: res.data };
        } else {
            return { error: res.error, status };
        }
    } catch (error) {
        console.error(error);
        return { error: error.message };
    }
};

const followAuthorAPI = (userToken, authorId) => {
    return fetchHandler(`/api/user/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({ followerId: authorId }),
    });
};

const unFollowAuthorAPI = (userToken, authorId) => {
    return fetchHandler(`/api/user/follow`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({ followerId: authorId }),
    });
};

const getNewsfeedAPI = async (userToken, refresh) => {
    let query = '';
    if (refresh) {
        query = '?refresh=true';
    }
    return fetchHandler(`/api/articles/newsfeed${query}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${userToken}` },
    });
};

const getLatestArticles = async (query) => {
    return fetchHandler(`/api/articles/latest${query}`);
};

const getUserSubscription = async (userToken) => {
    return fetchHandler('/api/user/subscribe', {
        method: 'GET',
        headers: { Authorization: `Bearer ${userToken}` },
    });
};

const getCategoriesAPI = async () => {
    return fetchHandler('/api/articles/categories');
};

const unFavoriteArticleAPI = (userToken, articleId) => {
    return fetchHandler('/api/user/favorite', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({ articleId }),
    });
};

const favoriteArticleAPI = (userToken, articleId) => {
    return fetchHandler('/api/user/favorite', {
        method: 'POST',
        headers: { Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({ articleId }),
    });
};

const getFullArticleAPI = (articleId, userToken) => {
    if (userToken) {
        return fetchHandler(`api/articles/${articleId}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${userToken}`,
            },
        });
    } else {
        return fetchHandler(`api/articles/${articleId}`);
    }
};

const unlikeArticleAPI = (userToken, articleId) => {
    return fetchHandler(`/api/articles/${articleId}/like`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${userToken}`,
        },
    });
};

const likeArticleAPI = (userToken, articleId) => {
    return fetchHandler(`/api/articles/${articleId}/like`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${userToken}`,
        },
    });
};

const commentArticleAPI = (userToken, articleId, comment) => {
    return fetchHandler(`/api/articles/${articleId}/comment`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ comment }),
    });
};

const replyCommentAPI = ({ userToken, articleId, commentId, reply }) => {
    return fetchHandler(`/api/articles/${articleId}/replyComment`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ commentId, reply }),
    });
};

const postArticleAPI = ({ title, context, preview, category, userToken, head }) => {
    return fetchHandler(`/api/articles`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${userToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, context, preview, category, head }),
    });
};

const getUserProfileAPI = (userToken) => {
    return fetchHandler('/api/user/profile', {
        headers: {
            Authorization: `Bearer ${userToken}`,
        },
    });
};

const updateSubscribeAPI = (userToken, subscription) => {
    return fetchHandler('/api/user/subscribe', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${userToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
    });
};

const updateUserProfileAPI = (userToken, updateInfo) => {
    return fetchHandler('/api/user/profile', {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${userToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateInfo),
    });
};

const getAuthorProfileAPI = (authorId) => {
    return fetchHandler(`/api/user/${authorId}`);
};

const createDraftAPI = (userToken, initTimeStamp) => {
    return fetchHandler('/api/drafts', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${userToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ head: initTimeStamp }),
    });
};

const updateDraftAPI = (userToken, draftId, updateData) => {
    return fetchHandler(`/api/drafts/${draftId}`, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${userToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ updateData }),
    });
};

const getDraftAPI = (userToken, draftId) => {
    return fetchHandler(`/api/drafts/${draftId}`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${userToken}`,
        },
    });
};

const deleteDraftAPI = (userToken, draftId) => {
    return fetchHandler(`/api/drafts/${draftId}`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${userToken}`,
        },
    });
};

const getDraftsListAPI = (userToken) => {
    return fetchHandler(`/api/drafts`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${userToken}`,
        },
    });
};

const readArticleAPI = (articleId) => {
    return fetchHandler(`/api/articles/${articleId}/read`, { method: 'PUT', headers: {} });
};

const getUploadUrlAPI = (userToken) => {
    return fetchHandler('/api/user/uploadAvatarURL', {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${userToken}`,
        },
    });
};

const getUnreadNotificationCountAPI = (userToken) => {
    return fetchHandler('/api/notifications/unreadCount', {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${userToken}`,
        },
    });
};

const getHotArticlesAPI = () => {
    return fetchHandler('/api/articles/hot');
};

const getNotificationsAPI = (userToken, offset) => {
    return fetchHandler(`/api/notifications/${offset}`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${userToken}`,
        },
    });
};

function timeTransformer(ISODateString) {
    const targetTimestamp = new Date(ISODateString).getTime();
    const currentTimestamp = new Date().getTime();
    // in minute
    let timeInterval = Math.floor((currentTimestamp - targetTimestamp) / 1000 / 60);
    if (timeInterval < 60) return `${timeInterval} 分鐘前`;

    // in hour
    timeInterval = Math.floor(timeInterval / 60);
    if (timeInterval < 24) return `${timeInterval} 小時前`;

    // in day
    timeInterval = Math.floor(timeInterval / 24);
    if (timeInterval < 4) return `${timeInterval} 天前`;

    return ISODateString.split('T')[0];
}
