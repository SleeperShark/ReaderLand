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

const followerAuthor = async (userToken, authorId) => {
    return await fetchHandler(`/api/user/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({ followerId: authorId }),
    });
};

const unFollowerAuthor = async (userToken, authorId) => {
    return await fetchHandler(`/api/user/follow`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({ followerId: authorId }),
    });
};

const getNewsfeed = async (userToken) => {
    return fetchHandler('/api/articles/newsfeed', {
        method: 'GET',
        headers: { Authorization: `Bearer ${userToken}` },
    });
};

const getLatestArticles = async () => {
    return fetchHandler('/api/articles/latest');
};

const getUserSubscription = async (userToken) => {
    return fetchHandler('/api/user/subscribe', {
        method: 'GET',
        headers: { Authorization: `Bearer ${userToken}` },
    });
};

const getCategories = async () => {
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
