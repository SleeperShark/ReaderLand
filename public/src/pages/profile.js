async function init() {
    const auth = await authenticate();

    if (!auth) {
        alert('請先登入');
        window.location.href = 'login.html';
    }

    await renderHeader(auth);

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
}

init();
