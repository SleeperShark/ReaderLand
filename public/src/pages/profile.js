async function init() {
    const auth = await authenticate();

    if (!auth) {
        alert('請先登入');
        window.location.href = 'login.html';
    }

    await renderHeader(auth);

    //TODO: navbar select event listener
    document.querySelector('#navbar').addEventListener('click', (e) => {
        if (e.target.matches('.navbar-item')) {
            document.querySelector('.navbar-item.selected')?.classList.remove('selected');
            e.target.classList.add('selected');
        }
    });
}

init();
