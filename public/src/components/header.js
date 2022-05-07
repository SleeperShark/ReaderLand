const token = localStorage.getItem('ReaderLandToken');
let user;
let socket;

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

    if (res.status != 200) {
        // token fail, remove token
        localStorage.removeItem('ReaderLandToken');
        return false;
    }

    user = (await res.json()).data;
    socket = io({
        autoConnect: false,
        auth: {
            token,
            required: true,
        },
    });
    socket.connect();
    return true;
}

function appendNotifications(notifications, prepend = false) {
    const container = document.getElementById('notification-container');
    const loadBtn = document.getElementById('notification-load');

    for (let i = notifications.length - 1; i >= 0; i--) {
        const { type, subject, createdAt, articleId } = notifications[i];

        const notificationDiv = document.createElement('div');
        notificationDiv.classList.add('notification');

        const divider = document.createElement('div');
        divider.classList.add('divider');

        // icon class
        let iconClass;
        let contentHTML;
        let unreadHTML = '';
        notificationDiv.dataset.subject = subject._id.toString();
        switch (type) {
            case 'comment':
                notificationDiv.dataset.type = 'comment';

                iconClass = 'fas fa-comment';
                contentHTML = `<span class="notification-subject">${subject.name}</span>在你的文章中留言。`;
                break;
            case 'reply':
                notificationDiv.dataset.type = 'reply';
                iconClass = 'fas fa-comments';
                contentHTML = `作者<span class="notification-subject">${subject.name}</span>回復了你的留言。`;
                break;
            case 'follow':
                notificationDiv.dataset.type = 'follow';
                iconClass = 'fas fa-thumbs-up';
                contentHTML = `<span class="notification-subject">${subject.name}</span>追蹤了你。`;
                break;
            case 'newPost':
                notificationDiv.dataset.type = 'newPost';
                iconClass = 'fas fa-file-alt';
                contentHTML = `你追蹤的作者<span class="notification-subject">${subject.name}</span>發表了新文章，快去看看吧！`;
                break;
        }

        if (notifications[i].hasOwnProperty('isread')) {
            unreadHTML = '<span class="unread"></span>';
        }
        notificationDiv.innerHTML = `
    <div class='notification-icon'>
                <i class="${iconClass}"></i>
            </div> 

            <div class="notification-content">
                ${contentHTML}
            </div>

    <span class="notification-time">${timeTransformer(createdAt)}</span>
    ${unreadHTML}
    `;

        if (prepend) {
            container.prepend(divider);
            container.prepend(notificationDiv);
        } else {
            container.insertBefore(notificationDiv, loadBtn);
            container.insertBefore(divider, loadBtn);
        }

        if (articleId) {
            notificationDiv.addEventListener('click', () => {
                window.location.href = `/article.html?id=${articleId}`;
            });
        } else {
            notificationDiv.addEventListener('click', () => {
                window.location.href = `/author.html?id=${subject._id}`;
            });
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

    <div id="notification-unread">
    <sapn id="unread-count"></span>
    </div>

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
        const avatar = document.getElementById('user-avatar');
        const userActions = document.getElementById('user-actions');

        const notificationIcon = document.getElementById('notification');
        const notificationContainer = document.getElementById('notification-container');
        const notificationLoadingBtn = document.getElementById('notification-load');
        const notifcationUnreadHint = document.getElementById('notification-unread');
        const notifcattionUnreadCount = document.getElementById('unread-count');

        avatar.addEventListener('click', () => {
            // Hide Notification
            notificationContainer.classList.add('hide');
            userActions.classList.toggle('hide');
        });

        notificationIcon.addEventListener('click', (evt) => {
            if (evt.target == notificationIcon) {
                notificationContainer.classList.toggle('hide');
                userActions.classList.add('hide');
            }

            //TODO: clear unread count
            if (!notificationContainer.classList.contains('hide')) {
                notifcationUnreadHint.style.display = 'none';
                const clearNum = document.querySelectorAll('.notification').length;

                socket.emit('clear-unread', JSON.stringify({ clearNum }));
                document.title = `ReaderLand`;
            }
        });

        notificationLoadingBtn.addEventListener('click', (evt) => {
            evt.preventDefault();
            const loaded = document.querySelectorAll('.notification').length;
            socket.emit('fetch-notification', JSON.stringify({ loadedNotification: loaded }));
        });

        document.getElementById('action-signout').addEventListener('click', () => {
            localStorage.removeItem('ReaderLandToken');
            alert('已成功登出 🚪');
            window.location.href = '/index.html';
        });

        // Socket handler
        //TODO: process notification when get from socket
        socket.on(`notifcations`, (msg) => {
            let {
                data: { notifications, length, unread },
            } = JSON.parse(msg);

            if (unread) {
                document.title = `(${unread}) ReaderLand`;
            } else {
                document.title = `ReaderLand`;
            }

            if (unread) {
                notifcationUnreadHint.style.display = 'flex';
                unread = unread > 99 ? 99 : unread;
                document.getElementById('unread-count').innerText = unread;
            } else {
                // not unread: hide unread count
                notifcationUnreadHint.style.display = 'none';
            }

            appendNotifications(notifications);
        });

        socket.on('update-notification', (msg) => {
            const {
                unreadCount,
                update: { prepend, remove },
            } = JSON.parse(msg);

            notifcattionUnreadCount.innerText = unreadCount;
            if (unreadCount) {
                notifcationUnreadHint.style.display = 'flex';
                document.title = `(${unreadCount}) ReaderLand`;
            }

            if (remove) {
                const allNotifications = document.querySelectorAll('.notification');
                for (let elem of allNotifications) {
                    if (elem.dataset.type == remove.type && elem.dataset.subject == remove.subject._id && elem.dataset.articleId == remove.articleId) {
                        elem.nextElementSibling.remove();
                        elem.remove();
                        break;
                    }
                }
            } else if (prepend) {
                appendNotifications([prepend], true);
            }
        });

        //TODO: fetch first 10 notification when init header
        socket.emit('fetch-notification', JSON.stringify({ loadedNotification: 0 }));
    }
}
