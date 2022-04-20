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
        headers: { Authorization: `Bearer ${token}` },
    });
};

const getLatestArticles = () => {
    return fetchHandler('/api/articles/latest');
};
