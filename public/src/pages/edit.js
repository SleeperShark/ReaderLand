async function init() {
    const auth = await authenticate();
    await renderHeader(auth);

    const submitArticle = document.getElementById('create-article');
    submitArticle.querySelector('span').innerText = '準備發佈';
    submitArticle.href = '#';

    addReSizeProperty();
    appendNewParagraphListener(document.querySelector('#headInput'));

    //TODO: title enter to first paragraph
    document.getElementById('title-input').addEventListener('keypress', (e) => {
        if (e.keyCode == 13 && !e.shiftKey) {
            e.preventDefault();

            if (e.target.value.trim().length == 0) {
                return;
            }
            document.getElementById('headInput').focus();
        }
    });
}

init();
// textarea auto resizing

function appendNewparagraph(currArea) {
    const newParagraph = document.createElement('div');
    newParagraph.classList.add('paragraph');
    const newArea = document.createElement('textarea');
    newArea.classList.add('text-input');
    newArea.placeholder = '在這裡編輯...';

    newParagraph.appendChild(newArea);
    const container = currArea.parentElement.parentElement;
    container.insertBefore(newParagraph, currArea.parentElement.nextSibling);

    addReSizeProperty();
    appendNewParagraphListener(newArea);
    removeEmptyParagraphListener(newArea);

    newArea.focus();
}

function addReSizeProperty() {
    $('textarea')
        .each(function () {
            this.setAttribute('style', 'height:' + this.scrollHeight + 'px;overflow-y:hidden;');
        })
        .on('input', function () {
            this.style.height = 'auto';
            this.style.height = this.scrollHeight + 'px';
        });
}

function appendNewParagraphListener(textArea) {
    textArea.addEventListener('keypress', (e) => {
        if (e.keyCode == 13 && !e.shiftKey) {
            e.preventDefault();

            if (e.target.value.trim().length == 0) {
                return;
            }

            appendNewparagraph(e.target);
        }
    });
}

function removeEmptyParagraphListener(textArea) {
    textArea.addEventListener('keydown', (e) => {
        if (e.keyCode == 8 && e.target.value.length == 0) {
            e.preventDefault();
            const previous = e.target.parentElement.previousSibling.querySelector('textarea');
            e.target.parentElement.remove();
            previous.focus();
        }
    });
}
