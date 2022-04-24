async function init() {
    const auth = await authenticate();

    if (!auth) {
        alert('請先登入');
        window.location.href = 'login.html';
    }

    await renderHeader(auth);

    //TODO: render each info display
    const { data: profile, error, status } = await getUserProfileAPI(token);

    console.log(profile);

    if (error) {
        console.error(status);
        console.error(error);
        alert('系統異常: getUserProfileAPI');
    }
}

init();

//TODO: navbar select event listener
document.querySelector('#navbar').addEventListener('click', (e) => {
    const selectedItem = e.target;
    if (selectedItem.matches('.navbar-item')) {
        // hide original display
        const currSelected = document.querySelector('.navbar-item.selected');
        document.getElementById(`${currSelected.id}-page`).classList.add('hide');
        currSelected.classList.remove('selected');

        // show selected display
        document.getElementById(`${selectedItem.id}-page`).classList.remove('hide');
        selectedItem.classList.add('selected');
    }
});
