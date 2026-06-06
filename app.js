// ==========================================
// グローバル状態管理
// ==========================================

const state = {
    currentPage: 'unknown', // 'create', 'participant', 'admin'
    eventId: null,
    publicToken: null,
    adminToken: null,
    isDarkMode: localStorage.getItem('darkMode') === 'true',
    currentEvent: null,
    currentResponses: []
};

// ==========================================
// ページ初期化
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    // テーマ初期化
    initTheme();
    
    // ページ判定
    const url = new URL(window.location.href);
    const page = url.searchParams.get('page');
    const eventId = url.searchParams.get('eventId');
    const token = url.searchParams.get('token');

    if (page === 'participant' && eventId && token) {
        state.currentPage = 'participant';
        state.eventId = eventId;
        state.publicToken = token;
        await initParticipantPage();
    } else if (page === 'admin' && eventId && token) {
        state.currentPage = 'admin';
        state.eventId = eventId;
        state.adminToken = token;
        await initAdminPage();
    } else {
        state.currentPage = 'create';
        initCreatePage();
    }

    // イベントリスナー設定
    setupEventListeners();
});

// ==========================================
// テーマ切り替え
// ==========================================

function initTheme() {
    const html = document.documentElement;
    const btn = document.getElementById('themeSwitchBtn');

    if (state.isDarkMode) {
        html.setAttribute('data-theme', 'dark');
        btn.textContent = '☀️';
    } else {
        html.removeAttribute('data-theme');
        btn.textContent = '🌙';
    }

    btn.addEventListener('click', () => {
        state.isDarkMode = !state.isDarkMode;
        localStorage.setItem('darkMode', state.isDarkMode);
        initTheme();
    });
}

// ==========================================
// イベント作成ページ初期化
// ==========================================

function initCreatePage() {
    const form = document.getElementById('createEventForm');
    const addDateBtn = document.getElementById('addDateBtn');
    const datesContainer = document.getElementById('datesContainer');

    // 日程追加ボタン
    addDateBtn.addEventListener('click', (e) => {
        e.preventDefault();
        addDateInput();
    });

    // フォーム送信
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleCreateEvent();
    });

    // 初期日程入力のフォーカスアウト時に削除ボタンを表示
    setupDateInputs();
}

function setupDateInputs() {
    const container = document.getElementById('datesContainer');
    const rows = container.querySelectorAll('.date-input-row');
    
    rows.forEach(row => {
        const removeBtn = row.querySelector('.remove-date-btn');
        const inputs = container.querySelectorAll('.date-input-row');
        
        if (inputs.length > 1) {
            removeBtn.style.display = 'block';
            removeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                row.remove();
            });
        }
    });
}

function addDateInput() {
    const container = document.getElementById('datesContainer');
    const row = document.createElement('div');
    row.className = 'date-input-row';
    row.innerHTML = `
        <input 
            type="datetime-local" 
            class="date-input" 
            placeholder="日時を選択"
            required
        >
        <button type="button" class="remove-date-btn">✕</button>
    `;

    const removeBtn = row.querySelector('.remove-date-btn');
    removeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        row.remove();
        setupDateInputs();
    });

    container.appendChild(row);
    setupDateInputs();
}

async function handleCreateEvent() {
    const title = document.getElementById('eventTitle').value;
    const description = document.getElementById('eventDescription').value;
    const deadline = document.getElementById('deadline').value;
    const dateInputs = document.querySelectorAll('.date-input');

    const dates = Array.from(dateInputs)
        .map(input => input.value)
        .filter(v => v);

    if (!title || dates.length === 0 || !deadline) {
        alert('必須項目を入力してください');
        return;
    }

    showLoading(true);

    try {
        const publicToken = generateToken();
        const adminToken = generateToken();

        const eventData = {
            title,
            description,
            dates,
            deadline,
            publicToken,
            adminToken,
            createdAt: new Date().toISOString()
        };

        const docRef = await db.collection('events').add(eventData);
        state.eventId = docRef.id;
        state.publicToken = publicToken;
        state.adminToken = adminToken;

        showEventCreated();
    } catch (error) {
        console.error('Error creating event:', error);
        alert('イベント作成に失敗しました: ' + error.message);
    } finally {
        showLoading(false);
    }
}

function showEventCreated() {
    const mainPage = document.getElementById('mainPage');
    const createdPage = document.getElementById('createdPage');
    const baseUrl = window.location.origin + window.location.pathname;

    const participantUrl = `${baseUrl}?page=participant&eventId=${state.eventId}&token=${state.publicToken}`;
    const adminUrl = `${baseUrl}?page=admin&eventId=${state.eventId}&token=${state.adminToken}`;

    document.getElementById('participantUrlInput').value = participantUrl;
    document.getElementById('adminUrlInput').value = adminUrl;

    mainPage.classList.add('hidden');
    createdPage.classList.remove('hidden');

    // URLコピーボタン
    document.getElementById('copyParticipantUrlBtn').addEventListener('click', () => {
        copyToClipboard(participantUrl);
    });

    document.getElementById('copyAdminUrlBtn').addEventListener('click', () => {
        copyToClipboard(adminUrl);
    });

    // QRコード表示
    document.getElementById('participantQRBtn').addEventListener('click', () => {
        showQRCode(participantUrl);
    });

    // QRコードダウンロード
    document.getElementById('downloadQRBtn').addEventListener('click', () => {
        downloadQRCode();
    });

    // 別のイベント作成
    document.getElementById('backToCreateBtn').addEventListener('click', () => {
        location.reload();
    });

    // モーダル制御
    const modal = document.getElementById('qrModal');
    const closeBtn = document.getElementById('closeQRModal');

    closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });
}

function showQRCode(url) {
    const modal = document.getElementById('qrModal');
    const container = document.getElementById('qrCodeContainer');
    
    container.innerHTML = '<canvas id="qrCanvas"></canvas>';
    
    new QRCode({
        text: url,
        width: 200,
        height: 200,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
    }).makeCode();

    // canvas を取得してコンテナに追加
    const canvas = document.createElement('canvas');
    const qr = new QRCode(canvas, {
        text: url,
        width: 250,
        height: 250,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
    });

    container.innerHTML = '';
    container.appendChild(canvas);
    modal.classList.remove('hidden');
}

function downloadQRCode() {
    const canvas = document.getElementById('qrCanvas');
    if (!canvas) return;

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `qrcode-${state.eventId}.png`;
    link.click();
}

// ==========================================
// 参加者ページ初期化
// ==========================================

async function initParticipantPage() {
    showLoading(true);

    try {
        const doc = await db.collection('events').doc(state.eventId).get();

        if (!doc.exists) {
            showError('イベントが見つかりません');
            return;
        }

        const eventData = doc.data();

        // トークン検証
        if (eventData.publicToken !== state.publicToken) {
            showError('アクセス権限がありません');
            return;
        }

        state.currentEvent = { id: doc.id, ...eventData };

        // 参加者ページのHTMLは index.html に含まれていないため、
        // 動的に作成する必要があります。
        createParticipantPageContent();
    } catch (error) {
        console.error('Error loading event:', error);
        showError('イベント情報の読み込みに失敗しました');
    } finally {
        showLoading(false);
    }
}

function createParticipantPageContent() {
    const mainContainer = document.getElementById('mainContainer');
    const mainPage = document.getElementById('mainPage');

    if (mainPage) {
        mainPage.innerHTML = `
            <div class="participant-page">
                <h2>${escapeHtml(state.currentEvent.title)}</h2>
                <p class="event-description">${escapeHtml(state.currentEvent.description)}</p>
                
                <form id="participantForm" class="form-card">
                    <div class="form-group">
                        <label for="participantName">お名前 *</label>
                        <input 
                            type="text" 
                            id="participantName" 
                            name="name" 
                            placeholder="例：山田太郎" 
                            required
                            maxlength="100"
                        >
                    </div>

                    <div class="form-group">
                        <label>都合がつく日時を選択 *</label>
                        <div id="responseAnswersContainer" class="response-answers">
                        </div>
                    </div>

                    <button type="submit" class="btn-primary btn-large">
                        回答を送信
                    </button>
                </form>
            </div>
        `;

        createAnswersTable();
        setupParticipantForm();
    }
}

function createAnswersTable() {
    const container = document.getElementById('responseAnswersContainer');
    const dates = state.currentEvent.dates;

    const table = document.createElement('table');
    table.className = 'response-table';

    // ヘッダー
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const dateHeader = document.createElement('th');
    dateHeader.textContent = '日時';
    headerRow.appendChild(dateHeader);

    ['○', '△', '×'].forEach(option => {
        const th = document.createElement('th');
        th.textContent = option;
        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // ボディ
    const tbody = document.createElement('tbody');

    dates.forEach((date, index) => {
        const row = document.createElement('tr');
        
        const dateCell = document.createElement('td');
        dateCell.className = 'date-cell';
        dateCell.textContent = formatDateTime(date);
        row.appendChild(dateCell);

        ['o', 'triangle', 'x'].forEach(value => {
            const td = document.createElement('td');
            const input = document.createElement('input');
            input.type = 'radio';
            input.name = `date_${index}`;
            input.value = value;
            input.className = 'response-radio';
            input.addEventListener('change', () => {
                row.classList.add('selected');
            });
            td.appendChild(input);
            row.appendChild(td);
        });

        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    container.innerHTML = '';
    container.appendChild(table);
}

function setupParticipantForm() {
    const form = document.getElementById('participantForm');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('participantName').value;
        const answers = [];
        const dates = state.currentEvent.dates;

        for (let i = 0; i < dates.length; i++) {
            const selected = document.querySelector(`input[name="date_${i}"]:checked`);
            if (!selected) {
                alert('すべての日時について選択してください');
                return;
            }
            answers.push(selected.value);
        }

        showLoading(true);

        try {
            await db.collection('responses').add({
                eventId: state.eventId,
                name,
                answers,
                createdAt: new Date().toISOString()
            });

            alert('回答が送信されました。ありがとうございます！');
            document.getElementById('participantName').value = '';
            document.querySelectorAll('.response-radio').forEach(input => {
                input.checked = false;
            });
        } catch (error) {
            console.error('Error saving response:', error);
            alert('回答の送信に失敗しました: ' + error.message);
        } finally {
            showLoading(false);
        }
    });
}

// ==========================================
// 管理者ページ初期化
// ==========================================

async function initAdminPage() {
    showLoading(true);

    try {
        const doc = await db.collection('events').doc(state.eventId).get();

        if (!doc.exists) {
            showError('イベントが見つかりません');
            return;
        }

        const eventData = doc.data();

        // トークン検証
        if (eventData.adminToken !== state.adminToken) {
            showError('アクセス権限がありません');
            return;
        }

        state.currentEvent = { id: doc.id, ...eventData };
        await loadAdminPageData();

    } catch (error) {
        console.error('Error loading admin page:', error);
        showError('ページの読み込みに失敗しました');
    } finally {
        showLoading(false);
    }
}

async function loadAdminPageData() {
    const event = state.currentEvent;

    // ページ表示
    const adminPage = document.getElementById('adminPage');
    if (adminPage) {
        adminPage.classList.remove('hidden');
    }

    document.getElementById('eventTitle').textContent = event.title;
    document.getElementById('eventDescription').textContent = event.description || '(説明なし)';
    document.getElementById('eventDeadline').textContent = formatDateTime(event.deadline);

    const datesList = document.getElementById('eventDatesList');
    datesList.innerHTML = event.dates.map(date => 
        `<p>• ${formatDateTime(date)}</p>`
    ).join('');

    // 回答データ読み込み
    await loadResponses();

    // 管理画面イベントリスナー設定
    setupAdminPageListeners();
}

async function loadResponses() {
    try {
        const snapshot = await db.collection('responses')
            .where('eventId', '==', state.eventId)
            .orderBy('createdAt', 'desc')
            .get();

        state.currentResponses = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        renderResponses();
        renderAnalytics();
    } catch (error) {
        console.error('Error loading responses:', error);
    }
}

function renderResponses() {
    const container = document.getElementById('responsesContainer');

    if (state.currentResponses.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>まだ回答がありません</p></div>';
        return;
    }

    const html = state.currentResponses.map(response => `
        <div class="response-card">
            <div class="response-header">
                <h4>${escapeHtml(response.name)}</h4>
                <div class="response-actions">
                    <button class="btn-small btn-secondary edit-response-btn" data-id="${response.id}">編集</button>
                    <button class="btn-small btn-danger delete-response-btn" data-id="${response.id}">削除</button>
                </div>
            </div>
            <div class="response-content">
                ${state.currentEvent.dates.map((date, idx) => `
                    <div class="response-item">
                        <span class="date">${formatDateTime(date)}</span>
                        <span class="answer">${getAnswerLabel(response.answers[idx])}</span>
                    </div>
                `).join('')}
            </div>
            <p class="response-date">回答日時: ${formatDateTime(response.createdAt)}</p>
        </div>
    `).join('');

    container.innerHTML = html;

    // イベントリスナー
    container.querySelectorAll('.edit-response-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const responseId = e.target.dataset.id;
            openEditResponseModal(responseId);
        });
    });

    container.querySelectorAll('.delete-response-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const responseId = e.target.dataset.id;
            openDeleteConfirmModal('response', responseId);
        });
    });
}

function renderAnalytics() {
    const container = document.getElementById('analyticsContainer');

    if (state.currentResponses.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>回答データが不足しています</p></div>';
        return;
    }

    const dates = state.currentEvent.dates;
    const analytics = dates.map((date, idx) => {
        const counts = { o: 0, triangle: 0, x: 0 };
        
        state.currentResponses.forEach(response => {
            const answer = response.answers[idx];
            if (answer in counts) counts[answer]++;
        });

        return {
            date,
            counts,
            total: state.currentResponses.length
        };
    });

    const html = `
        <div class="analytics-table">
            <table>
                <thead>
                    <tr>
                        <th>日時</th>
                        <th>○</th>
                        <th>△</th>
                        <th>×</th>
                        <th>参加予定</th>
                    </tr>
                </thead>
                <tbody>
                    ${analytics.map(item => `
                        <tr>
                            <td>${formatDateTime(item.date)}</td>
                            <td class="count-o">${item.counts.o}</td>
                            <td class="count-triangle">${item.counts.triangle}</td>
                            <td class="count-x">${item.counts.x}</td>
                            <td class="best-date">${item.counts.o > 0 ? item.counts.o : '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = html;
}

function setupAdminPageListeners() {
    // タブ切り替え
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
            btn.classList.add('active');
            document.getElementById(tabName).classList.remove('hidden');
        });
    });

    // イベント編集
    document.getElementById('editEventBtn').addEventListener('click', openEditEventModal);

    // イベント削除
    document.getElementById('deleteEventBtn').addEventListener('click', () => {
        openDeleteConfirmModal('event', state.eventId);
    });

    // CSVダウンロード
    document.getElementById('downloadCSVBtn').addEventListener('click', downloadCSV);

    // 検索
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const results = state.currentResponses.filter(r => 
            r.name.toLowerCase().includes(query)
        );
        
        const container = document.getElementById('searchResults');
        if (query === '') {
            container.innerHTML = '<div class="empty-state"><p>参加者を検索してください</p></div>';
        } else if (results.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>一致する参加者が見つかりません</p></div>';
        } else {
            container.innerHTML = results.map(response => `
                <div class="response-card">
                    <div class="response-header">
                        <h4>${escapeHtml(response.name)}</h4>
                        <div class="response-actions">
                            <button class="btn-small btn-secondary edit-response-btn" data-id="${response.id}">編集</button>
                            <button class="btn-small btn-danger delete-response-btn" data-id="${response.id}">削除</button>
                        </div>
                    </div>
                    <div class="response-content">
                        ${state.currentEvent.dates.map((date, idx) => `
                            <div class="response-item">
                                <span class="date">${formatDateTime(date)}</span>
                                <span class="answer">${getAnswerLabel(response.answers[idx])}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('');

            container.querySelectorAll('.edit-response-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const responseId = e.target.dataset.id;
                    openEditResponseModal(responseId);
                });
            });

            container.querySelectorAll('.delete-response-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const responseId = e.target.dataset.id;
                    openDeleteConfirmModal('response', responseId);
                });
            });
        }
    });
}

function openEditEventModal() {
    const modal = document.getElementById('editEventModal');
    const event = state.currentEvent;

    document.getElementById('editTitle').value = event.title;
    document.getElementById('editDescription').value = event.description;
    document.getElementById('editDeadline').value = event.deadline;

    const container = document.getElementById('editDatesContainer');
    container.innerHTML = event.dates.map((date, idx) => `
        <div class="date-input-row">
            <input 
                type="datetime-local" 
                class="date-input edit-date-input" 
                value="${date}"
                data-idx="${idx}"
            >
            <button type="button" class="remove-date-btn">✕</button>
        </div>
    `).join('');

    container.querySelectorAll('.remove-date-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            btn.parentElement.remove();
        });
    });

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn-secondary';
    addBtn.textContent = '+ 日程を追加';
    addBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const row = document.createElement('div');
        row.className = 'date-input-row';
        row.innerHTML = `
            <input type="datetime-local" class="date-input edit-date-input">
            <button type="button" class="remove-date-btn">✕</button>
        `;
        row.querySelector('.remove-date-btn').addEventListener('click', (e) => {
            e.preventDefault();
            row.remove();
        });
        container.appendChild(row);
    });
    container.parentElement.appendChild(addBtn);

    const form = document.getElementById('editEventForm');
    form.onsubmit = async (e) => {
        e.preventDefault();

        const title = document.getElementById('editTitle').value;
        const description = document.getElementById('editDescription').value;
        const deadline = document.getElementById('editDeadline').value;
        const dates = Array.from(document.querySelectorAll('.edit-date-input'))
            .map(input => input.value)
            .filter(v => v);

        if (!title || dates.length === 0 || !deadline) {
            alert('必須項目を入力してください');
            return;
        }

        showLoading(true);

        try {
            await db.collection('events').doc(state.eventId).update({
                title,
                description,
                deadline,
                dates
            });

            state.currentEvent.title = title;
            state.currentEvent.description = description;
            state.currentEvent.deadline = deadline;
            state.currentEvent.dates = dates;

            await loadAdminPageData();
            modal.classList.add('hidden');
            alert('イベントを更新しました');
        } catch (error) {
            console.error('Error updating event:', error);
            alert('更新に失敗しました: ' + error.message);
        } finally {
            showLoading(false);
        }
    };

    document.getElementById('closeEditModal').onclick = () => {
        modal.classList.add('hidden');
    };

    document.getElementById('cancelEditBtn').onclick = (e) => {
        e.preventDefault();
        modal.classList.add('hidden');
    };

    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    };

    modal.classList.remove('hidden');
}

function openEditResponseModal(responseId) {
    const response = state.currentResponses.find(r => r.id === responseId);
    if (!response) return;

    const modal = document.getElementById('editResponseModal');

    document.getElementById('editResponseName').value = response.name;

    const container = document.getElementById('editResponseAnswersContainer');
    container.innerHTML = state.currentEvent.dates.map((date, idx) => `
        <div class="form-group">
            <label>${formatDateTime(date)}</label>
            <div class="radio-group">
                <label>
                    <input type="radio" name="answer_${idx}" value="o" ${response.answers[idx] === 'o' ? 'checked' : ''}>
                    ○
                </label>
                <label>
                    <input type="radio" name="answer_${idx}" value="triangle" ${response.answers[idx] === 'triangle' ? 'checked' : ''}>
                    △
                </label>
                <label>
                    <input type="radio" name="answer_${idx}" value="x" ${response.answers[idx] === 'x' ? 'checked' : ''}>
                    ×
                </label>
            </div>
        </div>
    `).join('');

    const form = document.getElementById('editResponseForm');
    form.onsubmit = async (e) => {
        e.preventDefault();

        const name = document.getElementById('editResponseName').value;
        const answers = [];

        for (let i = 0; i < state.currentEvent.dates.length; i++) {
            const selected = document.querySelector(`input[name="answer_${i}"]:checked`);
            if (!selected) {
                alert('すべての日時について選択してください');
                return;
            }
            answers.push(selected.value);
        }

        showLoading(true);

        try {
            await db.collection('responses').doc(responseId).update({
                name,
                answers
            });

            await loadAdminPageData();
            modal.classList.add('hidden');
            alert('回答を更新しました');
        } catch (error) {
            console.error('Error updating response:', error);
            alert('更新に失敗しました: ' + error.message);
        } finally {
            showLoading(false);
        }
    };

    document.getElementById('closeResponseModal').onclick = () => {
        modal.classList.add('hidden');
    };

    document.getElementById('cancelResponseEditBtn').onclick = (e) => {
        e.preventDefault();
        modal.classList.add('hidden');
    };

    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    };

    modal.classList.remove('hidden');
}

function openDeleteConfirmModal(type, id) {
    const modal = document.getElementById('confirmDeleteModal');
    const messageEl = document.getElementById('deleteMessage');

    if (type === 'event') {
        messageEl.textContent = 'このイベントと全ての回答を削除してもよろしいですか？この操作は取り消せません。';
    } else {
        messageEl.textContent = 'この回答を削除してもよろしいですか？';
    }

    document.getElementById('confirmDeleteBtn').onclick = async () => {
        showLoading(true);
        try {
            if (type === 'event') {
                // イベント削除と関連回答の削除
                const snapshot = await db.collection('responses')
                    .where('eventId', '==', state.eventId)
                    .get();

                const batch = db.batch();

                snapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });

                batch.delete(db.collection('events').doc(id));
                await batch.commit();

                alert('イベントを削除しました');
                window.location.href = window.location.pathname;
            } else {
                await db.collection('responses').doc(id).delete();
                await loadAdminPageData();
                alert('回答を削除しました');
            }
            modal.classList.add('hidden');
        } catch (error) {
            console.error('Error deleting:', error);
            alert('削除に失敗しました: ' + error.message);
        } finally {
            showLoading(false);
        }
    };

    document.getElementById('cancelDeleteBtn').onclick = () => {
        modal.classList.add('hidden');
    };

    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    };

    modal.classList.remove('hidden');
}

function downloadCSV() {
    if (state.currentResponses.length === 0) {
        alert('ダウンロードするデータがありません');
        return;
    }

    const dates = state.currentEvent.dates;
    const headers = ['参加者名', ...dates.map(d => formatDateTime(d)), '回答日時'];

    const rows = state.currentResponses.map(response => [
        response.name,
        ...response.answers.map(a => getAnswerLabel(a)),
        formatDateTime(response.createdAt)
    ]);

    const csv = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `event-${state.eventId}-responses.csv`;
    link.click();
}

// ==========================================
// ユーティリティ関数
// ==========================================

function generateToken() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('コピーしました！');
    }).catch(() => {
        alert('コピーに失敗しました');
    });
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}年${month}月${day}日 ${hours}:${minutes}`;
}

function getAnswerLabel(answer) {
    const labels = {
        'o': '○',
        'triangle': '△',
        'x': '×'
    };
    return labels[answer] || '-';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showLoading(show) {
    const loadingScreen = document.getElementById('loadingScreen');
    if (show) {
        loadingScreen.classList.remove('hidden');
    } else {
        loadingScreen.classList.add('hidden');
    }
}

function showError(message) {
    const errorEl = document.getElementById('errorMessage');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
    } else {
        alert(message);
    }
}

function setupEventListeners() {
    // 基本的なイベントリスナーはページ初期化時に設定済み
}
