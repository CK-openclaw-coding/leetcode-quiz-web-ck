/**
 * JSON Quiz System - Optimized by 小高 (CK)
 */

let questionsData = [];
let answersData = {};
let currentQuizList = [];
let wrongQuestionsQueue = [];
let answeredCount = 0;

// On Load
document.addEventListener('DOMContentLoaded', () => {
    // Try to auto-load default files
    autoLoadFiles();
    
    // Theme setup
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
});

async function autoLoadFiles() {
    try {
        const qRes = await fetch('questions.json?v=1776217123);
        const aRes = await fetch('answers.json?v=1776217123);
        
        if (qRes.ok && aRes.ok) {
            questionsData = await qRes.json();
            answersData = await aRes.json();
            showStatus("已自動從伺服器載入題目與答案！", "ready");
            document.getElementById('start-btn').style.display = "inline-block";
        }
    } catch (err) {
        console.log("No default files found, waiting for manual upload.");
    }
}

function showStatus(msg, type) {
    const status = document.getElementById('status-msg');
    status.textContent = msg;
    status.className = `status ${type === 'ready' ? 'ready' : ''}`;
}

// File Handlers
function handleFiles(type, input) {
    const file = input.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const json = JSON.parse(e.target.result);
            if (type === 'q') questionsData = json;
            else answersData = json;
            checkReady();
        } catch (err) {
            alert("檔案格式錯誤，請確認是有效的 JSON 檔");
        }
    };
    reader.readAsText(file);
}

function checkReady() {
    if (questionsData.length && Object.keys(answersData).length) {
        showStatus("檔案載入完成！請點擊「開始測驗」", "ready");
        document.getElementById('start-btn').style.display = "inline-block";
    } else if (questionsData.length) {
        showStatus("題目檔已載入，等待答案檔...");
    } else if (Object.keys(answersData).length) {
        showStatus("答案檔已載入，等待題目檔...");
    }
}

// Quiz Core
function initQuiz(type = 'all') {
    if (type === 'all') {
        currentQuizList = [...questionsData];
        updateModeUI("全題庫模式", "mode-normal");
    } else if (type === 'wrong') {
        currentQuizList = [...wrongQuestionsQueue];
        wrongQuestionsQueue = [];
        updateModeUI(`錯題練習模式 (${currentQuizList.length} 題)`, "mode-practice");
    }

    document.getElementById('upload-section').style.display = 'none';
    document.getElementById('quiz-area').style.display = 'block';
    document.getElementById('score-board').style.display = 'none';
    document.getElementById('btn-retry-wrong').style.display = 'none';
    
    answeredCount = 0;
    updateProgress();
    renderQuiz(currentQuizList);
    window.scrollTo(0, 0);
}

function renderQuiz(list) {
    const container = document.getElementById('quiz-container');
    container.innerHTML = list.map(q => `
        <div class="card question-card" id="card-${q.id}">
            <div class="question-title">${q.id}. ${q.q}</div>
            <div class="options">
                ${q.options.map((opt, i) => `
                    <label class="option-label" id="label-${q.id}-${i}">
                        <input type="radio" name="q${q.id}" value="${i}" onchange="trackProgress()">
                        ${opt}
                    </label>
                `).join('')}
            </div>
            <div id="hint-${q.id}" class="hint"></div>
        </div>
    `).join('');
}

function trackProgress() {
    const total = currentQuizList.length;
    const answered = document.querySelectorAll('input[type="radio"]:checked').length;
    answeredCount = answered;
    updateProgress();
}

function updateProgress() {
    const total = currentQuizList.length || 1;
    const percent = (answeredCount / total) * 100;
    const fill = document.getElementById('progress-fill');
    if (fill) fill.style.width = `${percent}%`;
}

function submitQuiz() {
    let score = 0;
    const total = currentQuizList.length;
    wrongQuestionsQueue = [];

    currentQuizList.forEach(q => {
        // Correct answer index from answersData
        const correctIdx = answersData[q.id.toString()];
        const selected = document.querySelector(`input[name="q${q.id}"]:checked`);
        const hint = document.getElementById(`hint-${q.id}`);
        
        // Clear styles
        q.options.forEach((_, i) => {
            const lbl = document.getElementById(`label-${q.id}-${i}`);
            if (lbl) lbl.classList.remove('correct', 'wrong');
        });

        let isCorrect = false;
        if (selected) {
            const val = parseInt(selected.value);
            if (val === correctIdx) {
                score++;
                isCorrect = true;
                const selectedLbl = document.getElementById(`label-${q.id}-${val}`);
                if (selectedLbl) selectedLbl.classList.add('correct');
            } else {
                const selectedLbl = document.getElementById(`label-${q.id}-${val}`);
                if (selectedLbl) selectedLbl.classList.add('wrong');
            }
        }
        
        if (!isCorrect) {
            wrongQuestionsQueue.push(q);
            // Highlight the correct answer
            const correctLbl = document.getElementById(`label-${q.id}-${correctIdx}`);
            if (correctLbl) correctLbl.classList.add('correct');
            
            hint.style.display = 'block';
            // Get the text of the correct answer
            const correctText = q.options[correctIdx] || "（無效索引，請檢查答案檔）";
            const statusText = selected ? "❌ 答錯了！" : "⚠️ 未作答。";
            hint.innerText = `${statusText} 正確答案是：${correctText}`;
        }
    });

    displayResults(score, total);
}

function displayResults(score, total) {
    const board = document.getElementById('score-board');
    board.style.display = 'block';
    
    let msg = `<h3>測驗結束！得分：${score} / ${total}</h3>`;
    const retryBtn = document.getElementById('btn-retry-wrong');
    
    if (wrongQuestionsQueue.length > 0) {
        retryBtn.style.display = 'inline-block';
        retryBtn.innerText = `練習錯題 (共 ${wrongQuestionsQueue.length} 題)`;
        msg += `<p>還有 ${wrongQuestionsQueue.length} 題需要加強。</p>`;
        saveWrongToStorage();
    } else {
        retryBtn.style.display = 'none';
        msg += `<p>🎉 全部答對了！太厲害了！</p>`;
        localStorage.removeItem('wrongQueue');
    }

    board.innerHTML = msg;
    window.scrollTo(0, 0);
}

function saveWrongToStorage() {
    localStorage.setItem('wrongQueue', JSON.stringify(wrongQuestionsQueue));
}

function updateModeUI(text, className) {
    const indicator = document.getElementById('mode-indicator');
    if (indicator) {
        indicator.textContent = text;
        indicator.className = `badge ${className}`;
    }
}

// Search Feature
function filterQuestions(val) {
    const searchTerm = val.toLowerCase();
    const cards = document.querySelectorAll('.question-card');
    cards.forEach(card => {
        const text = card.innerText.toLowerCase();
        card.style.display = text.includes(searchTerm) ? 'block' : 'none';
    });
}

// Theme Feature
function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const target = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', target);
    localStorage.setItem('theme', target);
}
