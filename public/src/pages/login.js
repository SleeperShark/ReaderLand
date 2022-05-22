/* eslint-disable no-case-declarations */
/* eslint-disable no-undef */
async function init() {
    const auth = await authenticate();

    if (auth) {
        window.location.href = '/profile.html';
        return;
    }

    await renderHeader();
    document.getElementById('login-btn').href = '#email-input';
}

init();

//TODO: Switch between signin and signup form
const nameContainer = document.getElementById('name');
const repeatPasswordContainer = document.getElementById('repeat-password');
const submitBtn = document.getElementById('submit-btn');
const switchBtn = document.getElementById('switch');
switchBtn.addEventListener('click', () => {
    switch (switchBtn.dataset.state) {
        case 'sign-in':
            nameContainer.classList.remove('hide');
            repeatPasswordContainer.classList.remove('hide');
            switchBtn.innerText = '已是會員?';
            switchBtn.dataset.state = 'sign-up';
            submitBtn.innerText = '註冊';
            break;
        case 'sign-up':
            nameContainer.classList.add('hide');
            repeatPasswordContainer.classList.add('hide');
            switchBtn.innerText = '尚未註冊?';
            switchBtn.dataset.state = 'sign-in';
            submitBtn.innerText = '登入';
    }
});

//TODO: Focus and Blur effect for every field
document.querySelectorAll('input').forEach((elem) => {
    elem.addEventListener('blur', () => {
        const field = elem.previousSibling.previousSibling;
        field.style.color = 'rgba(0,0,0,0.5)';
        field.style.fontWeight = 'normal';
    });
    elem.addEventListener('focus', () => {
        const field = elem.previousSibling.previousSibling;
        field.style.color = 'rgba(0,0,0,1)';
        field.style.fontWeight = 'bolder';
    });
});

//TODO: collect form data for signin/signup
submitBtn.addEventListener('click', async (event) => {
    event.preventDefault();

    const email = document.getElementById('email-input').value;
    const password = document.getElementById('password-input').value;

    if (!email || !password) {
        await toastBaker({ icon: 'warning', text: '請確實填寫欄位!' });
        return;
    }

    const body = { email, password };
    let res;
    switch (switchBtn.dataset.state) {
        case 'sign-in':
            body.provider = 'native';

            showLoadingHint('sign-in');

            try {
                res = await fetch('/api/user/signin', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'Application/json',
                    },
                    body: JSON.stringify(body),
                });

                if (res.status == 200) {
                    res = await res.json();
                    const {
                        accessToken,
                        user: { name },
                    } = res.data;
                    localStorage.setItem('ReaderLandToken', accessToken);
                    await toastBaker({ icon: 'success', title: '登入成功', text: `${name}, 歡迎回到ReaderLand!`, timer: 2000 });
                    window.location.href = '/index.html';
                } else if (res.status == 400) {
                    // Unvalidated email
                    await toastBaker({ icon: 'warning', text: '信箱尚未驗證，請前往信箱確認驗證信😉。' });
                } else if (res.status == 500) {
                    await toastBaker({ icon: 'error', text: '系統異常，請稍後再試😫。' });
                } else {
                    await toastBaker({ icon: 'error', text: '登入資訊有誤，請再試一次😓。' });
                }
            } catch (error) {
                console.error(error);
                await toastBaker({ icon: 'error', text: '系統異常，請稍後再試😫。' });
            }
            hideLoadingHint();
            break;

        case 'sign-up':
            const name = document.getElementById('name-input').value;
            const repeatPW = document.getElementById('repeat-password-input').value;
            //verify repeat password
            if (password !== repeatPW) {
                await toastBaker({ icon: 'warning', text: '重複密碼不符，請再試一次😓。' });
                return;
            }

            body.name = name;
            //TODO: waiting register hint
            showLoadingHint('sign-up');

            try {
                res = await fetch('/api/user/signup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'Application/json',
                    },
                    body: JSON.stringify(body),
                });

                if (res.status == 200) {
                    res = await res.json();

                    const {
                        user: { name },
                    } = res.data;

                    await toastBaker({ icon: 'success', title: '註冊成功', text: `您好 ${name}, 請先至您的信箱點擊驗證連結完成註冊流程歐😀`, timer: 4000 });

                    window.location.href = '/login.html';
                } else if (res.status == 400) {
                    await toastBaker({ icon: 'error', text: '✉ 信箱格式不符。' });
                } else if (res.status == 403) {
                    await toastBaker({ icon: 'error', text: '✉ 此信箱已註冊。' });
                } else {
                    await toastBaker({ icon: 'error', text: '系統異常，請稍後再試😫。' });
                }
            } catch (error) {
                console.error(error);
                await toastBaker({ icon: 'error', text: '系統異常，請稍後再試😫。' });
            }
            hideLoadingHint();
    }
});

//TODO: submit when hit enter in password input
document.getElementById('password-input').addEventListener('keypress', (e) => {
    if (switchBtn.dataset.state == 'sign-in' && e.keyCode == 13) {
        submitBtn.click();
    }
});

const loadingHint = document.getElementById('loading-hint');
let intervalId;

function showLoadingHint(condition) {
    loadingHint.style.display = 'block';

    document.getElementById('loading-condition').innerText = condition === 'sign-in' ? '登入' : '註冊';
    let counting = 0;

    const waitingHintDot = document.getElementById('loading-dot');
    intervalId = setInterval(() => {
        switch (counting % 3) {
            case 0:
                waitingHintDot.innerText = '.';
                break;
            case 1:
                waitingHintDot.innerText = '..';
                break;
            case 2:
                waitingHintDot.innerText = '...';
        }
        counting += 1;
    }, 700);
}

function hideLoadingHint() {
    clearInterval(intervalId);
    loadingHint.style.display = 'none';
}
