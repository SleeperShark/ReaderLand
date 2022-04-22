function appendNewparagraph(currArea) {
    const newParagraph = document.createElement('div');
    newParagraph.classList.add('paragraph');
    // Text area attibute setting
    const newArea = document.createElement('textarea');
    newArea.classList.add('text-input');
    newArea.dataset.timestamp = new Date().getTime();
    newArea.placeholder = '在這裡編輯...';

    newParagraph.appendChild(newArea);
    const container = currArea.parentElement.parentElement;
    container.insertBefore(newParagraph, currArea.parentElement.nextSibling);

    addReSizeProperty();
    appendNewParagraphListener(newArea);
    removeEmptyParagraphListener(newArea);

    // setting next attribute for previous textArea
    if (!currArea.dataset.next) {
        // append case
        currArea.dataset.next = newArea.dataset.timestamp;
    } else {
        // insert case
        const temp = currArea.dataset.next;
        currArea.dataset.next = newArea.dataset.timestamp;
        newArea.dataset.next = temp;
    }

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
            const previousArea = e.target.parentElement.previousSibling.querySelector('textarea');

            let nextArea = e.target.parentElement.nextSibling;

            if (nextArea.classList?.contains('paragraph')) {
                // middle remove case
                nextArea = nextArea.querySelector('textarea');
                previousArea.dataset.next = nextArea.dataset.timestamp;
            } else {
                // bottom remove case
                previousArea.dataset.next = undefined;
            }

            e.target.parentElement.remove();
            previousArea.focus();
        }
    });
}

async function init() {
    const auth = await authenticate();
    await renderHeader(auth);

    const submitArticle = document.getElementById('create-article');
    submitArticle.querySelector('span').innerText = '準備發佈';
    submitArticle.href = '#';

    addReSizeProperty();
    appendNewParagraphListener(document.querySelector('#headInput'));

    const headInput = document.getElementById('headInput');
    //TODO: set headInput timeStamp
    headInput.dataset.timestamp = new Date().getTime();

    //TODO: title enter to first paragraph
    document.getElementById('title-input').addEventListener('keypress', (e) => {
        if (e.keyCode == 13 && !e.shiftKey) {
            e.preventDefault();

            if (e.target.value.trim().length == 0) {
                return;
            }

            headInput.focus();
        }
    });

    //TODO: submit btn event listener
    document.getElementById('create-article').addEventListener('click', (e) => {
        e.preventDefault();

        //collection paragraph context
        const context = {};
        document.querySelectorAll('textarea').forEach((textArea) => {
            const {
                dataset: { timestamp, next },
                value: content,
            } = textArea;

            context[timestamp] = { content, next };
        });

        console.log(context);
    });
}

init();
