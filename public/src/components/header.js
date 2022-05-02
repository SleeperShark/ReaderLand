const token = localStorage.getItem('ReaderLandToken');
let user;
let loadedNotification = 0;

async function authenticate() {
    if (!token) {
        return false;
    }

    const res = await fetch('/api/user/info', {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (res.status === 200) {
        user = (await res.json()).data;
        return true;
    } else {
        // token fail, remove token
        localStorage.removeItem('ReaderLandToken');
        return false;
    }
}

async function renderUnreadCount() {
    let { data: unreadCount, error, status } = await getUnreadNotificationCountAPI(token);

    if (error) {
        console.error(status);
        console.error(error);
        return '';
    }

    if (!unreadCount) {
        return '';
    }

    if (unreadCount > 99) {
        unreadCount = 99;
    }

    return `
<div id="notification-unread">
    <sapn id="unread-count">${unreadCount}</span>
</div>
`;
}

function appendNotifications(notifications) {
    const container = document.getElementById('notification-container');
    const loadBtn = document.getElementById('notification-load');

    for (let notification of notifications) {
        const { type, subject, createdAt, articleId } = notification;

        const notificationDiv = document.createElement('div');
        notificationDiv.classList.add('notification');

        const divider = document.createElement('div');
        divider.classList.add('divider');

        // icon class
        let iconClass;
        let contentHTML;
        switch (type) {
            case 'comment':
                iconClass = 'fas fa-comment';
                contentHTML = `<span class="notification-subject">${subject.name}</span>在你的文章中留言。`;
                break;
            case 'reply':
                iconClass = 'fas fa-comments';
                contentHTML = `作者<span class="notification-subject">${subject.name}</span>回復了你的留言。`;
                break;
            case 'follow':
                iconClass = 'fas fa-thumbs-up';
                contentHTML = `<span class="notification-subject">${subject.name}</span>追蹤了你。`;
                break;
            case 'newPost':
                iconClass = 'fas fa-file-alt';
                contentHTML = `你追蹤的作者<span class="notification-subject">${subject.name}</span>發表了新文章，快去看看吧！`;
                break;
        }

        notificationDiv.innerHTML = `
    <div class='notification-icon'>
                <i class="${iconClass}"></i>
            </div> 

            <div class="notification-content">
                ${contentHTML}
            </div>

    <span class="notification-time">${timeTransformer(createdAt)}</span>
    `;

        container.insertBefore(notificationDiv, loadBtn);
        container.insertBefore(divider, loadBtn);

        if (articleId) {
            notificationDiv.addEventListener('click', () => {
                window.location.href = `/article.html?id=${articleId}`;
            });
        }
    }
}

async function renderNotification(evt) {
    // clear unreadCount
    document.getElementById('notification-unread')?.remove();

    // load first ten notification
    const {
        data: { notifications },
        error,
        status,
    } = await getNotificationsAPI(token, loadedNotification);

    if (error) {
        console.error(status);
        console.error(error);
        return;
    }

    if (notifications.length) {
        notifications.reverse();
        // appending notification
        appendNotifications(notifications);

        loadedNotification += notifications.length;
    }

    // clear this event listener
    evt.target.removeEventListener('click', renderNotification);
}

async function loadingNotification(evt) {
    // load first ten notification
    const {
        data: { notifications },
        error,
        status,
    } = await getNotificationsAPI(token, loadedNotification);

    if (error) {
        console.error(status);
        console.error(error);
        alert('Error: getNotificationsAPI');
        return;
    }

    if (notifications.length) {
        notifications.reverse();
        // appending notification
        appendNotifications(notifications);

        loadedNotification += notifications.length;

        if (notifications.length < 10) {
            evt.target.remove();
        }
    }
}

async function renderHeader(auth) {
    let rightElementHTML;

    if (auth) {
        // const auth = await authenticate();
        rightElementHTML = `
<a id="create-article" href="/edit.html">
    <span>建立貼文</span>
</a>
<i id="notification" class="fas fa-bell">

    ${await renderUnreadCount()}

    <div id="notification-container" class="hide">
        <div id="notification-load">載入更多</div>
    </div>
</i>

<div id="user-avatar">
    <img id="avatar" src="${user.picture}" alt="user avatar" />
    
    <div id="user-actions" data-status="hide" class="hide">
        <a href="/profile.html" class="action" id="action-profile">
            <span id="profile">${user.name}<span>
        </a>
        <div class="divider"></div>
        <div class='action' id="action-signout">
            <span>Sign Out</span>
        </div>
    </div>

</div>
        `;
    } else {
        // TODO: Render unauth header
        rightElementHTML = `
<a href="/login.html" id="login-btn">登入</a>
        `;
    }

    document.querySelector('header').innerHTML = `
<div id="header-left">
    <i id="book-icon" class="fas fa-book-open"></i>
    <span>ReaderLand</span>
</div>
<div id="header-right">
    ${rightElementHTML}
</div>
    `;

    document.querySelector('#header-left').addEventListener('click', () => {
        window.location.href = '/index.html';
    });

    //TODO: auth function
    if (auth) {
        document.getElementById('user-avatar').addEventListener('click', () => {
            const userActions = document.getElementById('user-actions');
            switch (userActions.dataset.status) {
                case 'hide':
                    userActions.classList.remove('hide');
                    userActions.dataset.status = 'show';
                    break;
                case 'show':
                    userActions.classList.add('hide');
                    userActions.dataset.status = 'hide';
            }
        });

        document.getElementById('action-signout').addEventListener('click', () => {
            localStorage.removeItem('ReaderLandToken');
            alert('已成功登出 🚪');
            window.location.href = '/index.html';
        });

        const notificationIcon = document.getElementById('notification');
        const notificationContainer = document.getElementById('notification-container');
        //TODO: first fetch Notification when click icon
        notificationIcon.addEventListener('click', renderNotification);
        //TODO: show container
        notificationIcon.addEventListener('click', (evt) => {
            if (evt.target == notificationIcon) {
                notificationContainer.classList.toggle('hide');
            }
        });

        let showNotificationTimer;

        // notificationContainer.addEventListener('mouseleave', () => {
        //     showNotificationTimer = setTimeout(() => {
        //         notificationContainer.classList.add('hide');
        //     }, 1000);
        // });

        // notificationContainer.addEventListener('mouseover', () => {
        //     clearTimeout(showNotificationTimer);
        // });

        //TODO: load more btn
        document.getElementById('notification-load').addEventListener('click', loadingNotification);
    }
}
