(function() {
    'use strict';

    // ============================================================
    //  CONFIGURATION – adjust to match your deployment
    // ============================================================
    var CONFIG = {
        // Base URL for exam files – set to '/Test/' or '/model-exam-sets/Set/'
        BASE_URL: '',
        // Auto‑detect base from script location
        AUTO_DETECT_BASE: true,
        // Show a "Reset Test" button on the exam page
        SHOW_RESET_BUTTON: true
    };

    if (CONFIG.AUTO_DETECT_BASE && !CONFIG.BASE_URL) {
        var scripts = document.getElementsByTagName('script');
        var currentScript = scripts[scripts.length - 1];
        var src = currentScript.getAttribute('src') || '';
        var path = src.replace(/\/[^/]*$/, '') + '/';
        CONFIG.BASE_URL = path;
    }
    if (CONFIG.BASE_URL && !CONFIG.BASE_URL.endsWith('/')) {
        CONFIG.BASE_URL += '/';
    }

    // ============================================================
    //  UTILITY FUNCTIONS
    // ============================================================
    function isImageUrl(url) {
        if (!url || typeof url !== 'string') return false;
        var clean = url.split('?')[0].split('#')[0];
        return /\.(jpg|jpeg|png|gif|svg|webp|bmp|ico|tiff|tif)(\?.*)?$/i.test(clean);
    }

    function renderTextWithImages(text, className) {
        if (!text) return text;
        className = className || 'inline-image';
        var trimmed = text.trim();
        if (/^https?:\/\/[^\s]+$/i.test(trimmed)) {
            return createImageHTML(trimmed, className);
        }
        var urlRegex = /(https?:\/\/[^\s]+?)(?=[\s,;!?.]|$)/gi;
        var hasImage = false;
        var parts = [];
        var lastIndex = 0;
        var match;
        while ((match = urlRegex.exec(text)) !== null) {
            var url = match[0];
            if (isImageUrl(url)) {
                if (match.index > lastIndex) {
                    parts.push(text.substring(lastIndex, match.index));
                }
                parts.push(createImageHTML(url, className));
                lastIndex = match.index + url.length;
                hasImage = true;
            }
        }
        if (lastIndex < text.length) {
            parts.push(text.substring(lastIndex));
        }
        if (!hasImage) return text;
        var joined = parts.join('');
        var imgTagPattern = /^\s*<span[^>]*>.*<\/span>\s*$/i;
        if (imgTagPattern.test(joined.trim())) {
            return joined.trim();
        }
        return '<span class="text-with-image">' + joined + '</span>';
    }

    function renderOptionWithImage(text) {
        if (!text) return text;
        var trimmed = text.trim();
        if (/^https?:\/\/[^\s]+$/i.test(trimmed)) {
            return '<div class="option-content">' +
                    '<div class="option-image-wrapper">' +
                        createImageHTML(trimmed, 'option-image') +
                    '</div>' +
                '</div>';
        }
        var rendered = renderTextWithImages(text, 'option-image');
        return '<div class="option-content"><span class="option-text">' + rendered + '</span></div>';
    }

    function createImageHTML(src, className) {
        return '<span class="image-wrapper" style="display:inline-block;max-width:100%;">' +
                    '<img src="' + src + '" alt="Image" class="' + className + '" loading="lazy" ' +
                        'onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'inline-block\';" ' +
                        'style="display:block;max-width:100%;"/>' +
                    '<span class="image-fallback" style="display:none;padding:8px 14px;background:#f5f7fa;border-radius:8px;color:#78909c;font-size:0.85rem;">' +
                        '<i class="fas fa-image" style="margin-right:6px;"></i> Image not available' +
                    '</span>' +
                '</span>';
    }

    function getElement(id) {
        return document.getElementById(id);
    }

    function LSget(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }
    function LSset(k, v) { try { localStorage.setItem(k, v); return true; } catch (_) { return false; } }
    function LSremove(k) { try { localStorage.removeItem(k); } catch (_) {} }

    function formatTime(sec) {
        if (sec < 0) sec = 0;
        var m = Math.floor(sec / 60);
        var s = Math.floor(sec % 60);
        return m + ':' + s.toString().padStart(2, '0');
    }

    function formatTimeLong(sec) {
        if (sec < 0) sec = 0;
        var m = Math.floor(sec / 60);
        var s = Math.floor(sec % 60);
        return m > 0 ? m + ' min ' + s + ' sec' : s + ' seconds';
    }

    function generateSetId(questionSet) {
        if (questionSet.id) return questionSet.id;
        var name = questionSet.name || 'set';
        var str = name + '|' + JSON.stringify(questionSet.questions);
        var hash = 0;
        for (var i = 0; i < str.length; i++) {
            var char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        return 'set_' + Math.abs(hash).toString(16).slice(0, 8);
    }

    // ============================================================
    //  RESET FUNCTION – supports ?reset=1 on any page
    // ============================================================
    function resetTest(questionSet) {
        var id = generateSetId(questionSet);
        var keys = ['_status', '_answers', '_startTime', '_endTime', '_marks', '_submittedAt'];
        keys.forEach(function(k) {
            LSremove('mcq_' + id + k);
        });
        var url = new URL(window.location.href);
        url.searchParams.delete('reset');
        window.location.replace(url.toString());
    }

    // ============================================================
    //  MAIN EXPOSED FUNCTION
    // ============================================================
    window.startTest = function(questionSet, options) {
        options = options || {};
        var baseUrl = options.baseUrl || CONFIG.BASE_URL || '';
        if (baseUrl && !baseUrl.endsWith('/')) baseUrl += '/';

        if (!questionSet || !questionSet.questions || questionSet.questions.length === 0) {
            console.error('Invalid questionSet');
            return;
        }

        var url = new URL(window.location.href);
        // If ?reset=1 is present, clear everything and reload
        if (url.searchParams.has('reset') && url.searchParams.get('reset') === '1') {
            resetTest(questionSet);
            return;
        }

        var state = {
            questionSet: questionSet,
            currentQuestionIndex: 0,
            userAnswers: {},
            testActive: false,
            timerInterval: null,
            deadline: null,
            SET_ID: null,
            TOTAL_QUESTIONS: 0,
            TOTAL_TIME_SECONDS: 0,
            STORAGE_KEY_STATUS: '',
            STORAGE_KEY_ANSWERS: '',
            STORAGE_KEY_START_TIME: '',
            STORAGE_KEY_END_TIME: '',
            STORAGE_KEY_MARKS: '',
            STORAGE_KEY_SUBMITTED_AT: '',
            $: {}
        };

        var ids = [
            'pre-test-section', 'test-section', 'results-section',
            'timer-display', 'navbar-brand',
            'hero-set-name', 'hero-details', 'hero-q-count', 'hero-time', 'hero-note',
            'btn-start-test',
            'q-number-label', 'q-text', 'options-list',
            'btn-prev', 'btn-next', 'btn-submit-test',
            'sidebar-total', 'sidebar-answered-num', 'q-grid',
            'results-set-name', 'results-score', 'results-denom',
            'results-percentage', 'results-time-taken', 'results-detail',
            'warning-modal', 'modal-unanswered-count', 'btn-modal-cancel', 'btn-modal-submit',
            // Reset button (new)
            'btn-reset-test'
        ];
        ids.forEach(function(id) { state.$[id] = getElement(id); });

        state.TOTAL_QUESTIONS = questionSet.questions.length;
        state.TOTAL_TIME_SECONDS = Math.floor(state.TOTAL_QUESTIONS * 0.8 * 60);
        state.SET_ID = generateSetId(questionSet);
        state.STORAGE_KEY_STATUS = 'mcq_' + state.SET_ID + '_status';
        state.STORAGE_KEY_ANSWERS = 'mcq_' + state.SET_ID + '_answers';
        state.STORAGE_KEY_START_TIME = 'mcq_' + state.SET_ID + '_startTime';
        state.STORAGE_KEY_END_TIME = 'mcq_' + state.SET_ID + '_endTime';
        state.STORAGE_KEY_MARKS = 'mcq_' + state.SET_ID + '_marks';
        state.STORAGE_KEY_SUBMITTED_AT = 'mcq_' + state.SET_ID + '_submittedAt';

        var status = LSget(state.STORAGE_KEY_STATUS);
        if (status === 'completed' || status === 'submitted') {
            var ans = LSget(state.STORAGE_KEY_ANSWERS);
            if (ans) { try { state.userAnswers = JSON.parse(ans); } catch (_) { state.userAnswers = {}; } }
            showResults(state);
            return;
        }
        if (status === 'in_progress') {
            var ans2 = LSget(state.STORAGE_KEY_ANSWERS);
            if (ans2) { try { state.userAnswers = JSON.parse(ans2); } catch (_) { state.userAnswers = {}; } }
            var hasTime = resumeTimerFromStoredDeadline(state);
            state.testActive = true;
            enableTestRestrictions(state);
            blockBackButton(state);
            showTestInterface(state);
            if (!hasTime) autoSubmit(state);
            return;
        }

        showPreTest(state);
        if (state.$['btn-start-test']) {
            state.$['btn-start-test'].addEventListener('click', function() {
                beginTest(state);
            });
        }

        // ---- Reset button (new) ----
        if (state.$['btn-reset-test']) {
            state.$['btn-reset-test'].addEventListener('click', function() {
                if (confirm('⚠️ Are you sure you want to reset this test? All progress will be lost.')) {
                    resetTest(questionSet);
                }
            });
        }
    };

    // ============================================================
    //  showPreTest – now includes reset button
    // ============================================================
    function showPreTest(state) {
        var $ = state.$;
        if ($['pre-test-section']) $['pre-test-section'].style.display = 'block';
        if ($['test-section']) $['test-section'].style.display = 'none';
        if ($['results-section']) $['results-section'].style.display = 'none';
        if ($['timer-display']) $['timer-display'].style.display = 'none';
        if ($['navbar-brand']) $['navbar-brand'].textContent = '📝 ' + state.questionSet.name;
        if ($['hero-set-name']) $['hero-set-name'].textContent = state.questionSet.name;
        if ($['hero-details']) $['hero-details'].textContent = state.questionSet.details || '';
        if ($['hero-q-count']) $['hero-q-count'].textContent = state.TOTAL_QUESTIONS;
        var totalMinutes = state.TOTAL_TIME_SECONDS / 60;
        if ($['hero-time']) $['hero-time'].textContent = totalMinutes + ':00';

        if ($['hero-note']) {
            $['hero-note'].innerHTML =
                '<div style="text-align:left; max-width:500px; margin:10px auto; font-size:0.9rem; line-height:1.6; background:#e8f5e9; padding:15px 20px; border-radius:8px; border-left:4px solid #2e7d32;">' +
                '<p><strong>📌 ⚠️ Important Exam Instructions</strong></p>' +
                '<ul style="list-style:none; padding-left:0; margin:5px 0;">' +
                '<li>🏁 Exam will open in full-screen mode.</li>' +
                '<li>📝 You may take this test only once.</li>' +
                '<li>⏱️ Timer starts immediately after clicking "Start Test".</li>' +
                '<li>🔔 Time alerts at 10 and 5 minutes remaining.</li>' +
                '<li>⏰ Test will auto-submit when time ends.</li>' +
                '<li>🔄 Timer cannot be paused or restarted.</li>' +
                '<li>💾 Refreshing restores only attempted answers.</li>' +
                '<li>🚫 Copying text or images is not allowed.</li>' +
                '</ul>' +
                '<p style="margin-top:10px; color:#1b5e20; font-weight:bold;">✅ Ready? Click the button below.</p>' +
                '</div>';
        }

        if ($['btn-start-test']) {
            $['btn-start-test'].disabled = false;
            $['btn-start-test'].textContent = '🚀 Start Test';
        }

        // Show reset button in pre-test section if configured
        if (CONFIG.SHOW_RESET_BUTTON && $['btn-reset-test']) {
            $['btn-reset-test'].style.display = 'inline-block';
        }

        disableTestRestrictions(state);
    }

    // ============================================================
    //  showResults – now includes reset button
    // ============================================================
    function showResults(state, marksOverride, timeOverride, auto) {
        var $ = state.$;
        if ($['pre-test-section']) $['pre-test-section'].style.display = 'none';
        if ($['test-section']) $['test-section'].style.display = 'none';
        if ($['results-section']) $['results-section'].style.display = 'block';
        if ($['timer-display']) $['timer-display'].style.display = 'none';
        if ($['navbar-brand']) $['navbar-brand'].textContent = '📊 Results - ' + state.questionSet.name;

        var marks = marksOverride !== undefined ? marksOverride : parseInt(LSget(state.STORAGE_KEY_MARKS) || '0');
        var submittedStr = LSget(state.STORAGE_KEY_SUBMITTED_AT);
        var startStr = LSget(state.STORAGE_KEY_START_TIME);
        var timeTaken = timeOverride;
        if (timeTaken === undefined && submittedStr && startStr) {
            timeTaken = Math.floor((parseInt(submittedStr) - parseInt(startStr)) / 1000);
        }
        if (timeTaken === undefined || timeTaken < 0) timeTaken = 0;

        var ans = LSget(state.STORAGE_KEY_ANSWERS);
        if (ans) { try { state.userAnswers = JSON.parse(ans); } catch (_) { state.userAnswers = {}; } }

        var percent = state.TOTAL_QUESTIONS > 0 ? Math.round((marks / state.TOTAL_QUESTIONS) * 100) : 0;
        if ($['results-set-name']) $['results-set-name'].textContent = state.questionSet.name;
        if ($['results-score']) $['results-score'].textContent = marks;
        if ($['results-denom']) $['results-denom'].textContent = '/ ' + state.TOTAL_QUESTIONS;
        if ($['results-percentage']) $['results-percentage'].textContent = percent + '%';
        if ($['results-time-taken']) {
            $['results-time-taken'].textContent = '⏱️ Time taken: ' + formatTimeLong(timeTaken) + (auto ? ' (Auto-submitted)' : '');
        }

        // Show reset button in results section
        if (CONFIG.SHOW_RESET_BUTTON && $['btn-reset-test']) {
            $['btn-reset-test'].style.display = 'inline-block';
            $['btn-reset-test'].textContent = '🔄 Reset Test';
        }

        if ($['results-detail']) {
            $['results-detail'].innerHTML = '';
            var letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
            state.questionSet.questions.forEach(function(q, idx) {
                var userAns = state.userAnswers[idx];
                var correctAns = q.correct;
                var isCorrect = (userAns === correctAns);
                var wasAnswered = (userAns !== undefined && userAns !== null);

                var card = document.createElement('div');
                card.className = 'result-card';
                if (wasAnswered) card.classList.add(isCorrect ? 'correct' : 'incorrect');

                var badge = '';
                if (!wasAnswered) {
                    badge = '<span class="r-badge" style="background:#fff3e0;color:#E65100;">⚠️ NOT ANSWERED</span>';
                } else if (isCorrect) {
                    badge = '<span class="r-badge correct-badge">✅ CORRECT</span>';
                } else {
                    badge = '<span class="r-badge incorrect-badge">❌ INCORRECT</span>';
                }

                var renderedQ = renderTextWithImages(q.question, 'inline-image');

                var optsHTML = '';
                q.options.forEach(function(opt, optIdx) {
                    var liClass = '';
                    if (optIdx === correctAns && optIdx === userAns) liClass = 'both-correct';
                    else if (optIdx === correctAns) liClass = 'correct-answer';
                    else if (optIdx === userAns && !isCorrect) liClass = 'user-answer';

                    var label = letters[optIdx] || (optIdx + 1);
                    var prefix = '';
                    if (optIdx === correctAns && optIdx === userAns) prefix = '✅ ';
                    else if (optIdx === correctAns) prefix = '✅ ';
                    else if (optIdx === userAns && !isCorrect) prefix = '❌ ';

                    var optRendered = renderTextWithImages(opt, 'option-image');
                    optsHTML += '<li class="' + liClass + '"><strong>' + label + '.</strong> ' + prefix + optRendered + '</li>';
                });

                card.innerHTML = badge + '<div class="r-q-text">Q' + (idx + 1) + ': ' + renderedQ + '</div><ul class="r-options">' + optsHTML + '</ul>';
                $['results-detail'].appendChild(card);
            });
        }

        if ($['results-section']) $['results-section'].scrollIntoView({ behavior: 'smooth' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // ============================================================
    //  All other functions (unchanged from original)
    // ============================================================
    function beginTest(state) {
        var status = LSget(state.STORAGE_KEY_STATUS);
        if (status === 'completed' || status === 'submitted') {
            alert('You have already taken this test.');
            showResults(state);
            return;
        }
        if (status === 'in_progress') {
            resumeTest(state);
            return;
        }
        var now = Date.now();
        state.deadline = now + state.TOTAL_TIME_SECONDS * 1000;
        LSset(state.STORAGE_KEY_STATUS, 'in_progress');
        LSset(state.STORAGE_KEY_START_TIME, now.toString());
        LSset(state.STORAGE_KEY_END_TIME, state.deadline.toString());
        LSset(state.STORAGE_KEY_ANSWERS, JSON.stringify({}));
        state.userAnswers = {};
        state.currentQuestionIndex = 0;
        state.testActive = true;
        enableTestRestrictions(state);
        blockBackButton(state);
        requestFullscreen();
        showTestInterface(state);
        startTimerWithDeadline(state);
    }

    function resumeTest(state) {
        var hasTime = resumeTimerFromStoredDeadline(state);
        state.testActive = true;
        enableTestRestrictions(state);
        blockBackButton(state);
        showTestInterface(state);
        if (!hasTime) autoSubmit(state);
    }

    function showTestInterface(state) {
        var $ = state.$;
        if ($['pre-test-section']) $['pre-test-section'].style.display = 'none';
        if ($['test-section']) $['test-section'].style.display = 'block';
        if ($['results-section']) $['results-section'].style.display = 'none';
        if ($['timer-display']) {
            $['timer-display'].style.display = 'inline-block';
            $['timer-display'].textContent = formatTime(state.TOTAL_TIME_SECONDS);
        }
        if ($['navbar-brand']) $['navbar-brand'].textContent = state.questionSet.name;
        if ($['sidebar-total']) $['sidebar-total'].textContent = 'Total: ' + state.TOTAL_QUESTIONS;
        if ($['q-grid']) {
            $['q-grid'].innerHTML = '';
            for (var i = 0; i < state.TOTAL_QUESTIONS; i++) {
                var dot = document.createElement('span');
                dot.className = 'q-dot';
                dot.textContent = i + 1;
                dot.dataset.index = i;
                dot.addEventListener('click', (function(idx) {
                    return function() {
                        state.currentQuestionIndex = idx;
                        renderQuestion(state);
                        updateSidebarHighlight(state);
                    };
                })(i));
                $['q-grid'].appendChild(dot);
            }
        }
        updateSidebarHighlight(state);
        updateAnsweredCount(state);
        renderQuestion(state);

        if ($['btn-prev']) {
            $['btn-prev'].addEventListener('click', function() { navigateQuestion(state, -1); });
        }
        if ($['btn-next']) {
            $['btn-next'].addEventListener('click', function() { navigateQuestion(state, 1); });
        }
        if ($['btn-submit-test']) {
            $['btn-submit-test'].addEventListener('click', function() {
                if (!state.testActive) return;
                var unanswered = state.TOTAL_QUESTIONS - answeredCount(state);
                if (unanswered > 0) {
                    showWarningModal(state);
                } else {
                    submitTest(state);
                }
            });
        }
        if ($['btn-modal-cancel']) {
            $['btn-modal-cancel'].addEventListener('click', function() { hideWarningModal(state); });
        }
        if ($['btn-modal-submit']) {
            $['btn-modal-submit'].addEventListener('click', function() { submitTest(state); });
        }
        if ($['warning-modal']) {
            $['warning-modal'].addEventListener('click', function(e) {
                if (e.target === $['warning-modal']) hideWarningModal(state);
            });
        }

        // Hide reset button during test
        if ($['btn-reset-test']) {
            $['btn-reset-test'].style.display = 'none';
        }

        document.addEventListener('keydown', function(e) {
            if (!state.testActive) return;
            if ($['warning-modal'] && $['warning-modal'].style.display === 'flex') return;
            if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                navigateQuestion(state, -1);
            } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                navigateQuestion(state, 1);
            } else if (e.key >= '1' && e.key <= '9') {
                var idx = parseInt(e.key) - 1;
                var q = state.questionSet.questions[state.currentQuestionIndex];
                if (q && idx < q.options.length) {
                    e.preventDefault();
                    selectOption(state, idx);
                }
            } else if (e.key === 'a' || e.key === 'A') { selectOption(state, 0); }
            else if (e.key === 'b' || e.key === 'B') { selectOption(state, 1); }
            else if (e.key === 'c' || e.key === 'C') { selectOption(state, 2); }
            else if (e.key === 'd' || e.key === 'D') { selectOption(state, 3); }
        });
    }

    function renderQuestion(state) {
        var $ = state.$;
        var q = state.questionSet.questions[state.currentQuestionIndex];
        if (!q) return;
        if ($['q-number-label']) {
            $['q-number-label'].textContent = 'QUESTION ' + (state.currentQuestionIndex + 1) + ' / ' + state.TOTAL_QUESTIONS;
        }
        if ($['q-text']) {
            $['q-text'].innerHTML = renderTextWithImages(q.question, 'inline-image');
        }
        if ($['options-list']) {
            $['options-list'].innerHTML = '';
            var letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
            q.options.forEach(function(opt, idx) {
                var li = document.createElement('li');
                var renderedOpt = renderOptionWithImage(opt);
                li.innerHTML = '<span class="option-letter">' + (letters[idx] || (idx + 1)) + '</span> ' + renderedOpt;
                li.dataset.optionIndex = idx;
                li.addEventListener('click', function() { selectOption(state, idx); });
                if (state.userAnswers[state.currentQuestionIndex] === idx) li.classList.add('selected');
                $['options-list'].appendChild(li);
            });
        }
        if ($['btn-prev']) $['btn-prev'].disabled = (state.currentQuestionIndex === 0);
        if ($['btn-next']) $['btn-next'].disabled = (state.currentQuestionIndex >= state.TOTAL_QUESTIONS - 1);
        updateSidebarHighlight(state);
        updateAnsweredCount(state);
    }

    function selectOption(state, idx) {
        if (!state.testActive) return;
        state.userAnswers[state.currentQuestionIndex] = idx;
        LSset(state.STORAGE_KEY_ANSWERS, JSON.stringify(state.userAnswers));
        renderQuestion(state);
    }

    function navigateQuestion(state, dir) {
        var newIdx = state.currentQuestionIndex + dir;
        if (newIdx >= 0 && newIdx < state.TOTAL_QUESTIONS) {
            state.currentQuestionIndex = newIdx;
            renderQuestion(state);
        }
    }

    function updateSidebarHighlight(state) {
        var $ = state.$;
        if (!$['q-grid']) return;
        var dots = $['q-grid'].querySelectorAll('.q-dot');
        dots.forEach(function(dot) {
            var i = parseInt(dot.dataset.index);
            dot.classList.remove('answered', 'current');
            if (state.userAnswers[i] !== undefined && state.userAnswers[i] !== null) {
                dot.classList.add('answered');
            }
            if (i === state.currentQuestionIndex) {
                dot.classList.add('current');
            }
        });
    }

    function updateAnsweredCount(state) {
        if (state.$['sidebar-answered-num']) {
            state.$['sidebar-answered-num'].textContent = answeredCount(state);
        }
    }

    function answeredCount(state) {
        return Object.keys(state.userAnswers).filter(function(k) {
            return state.userAnswers[k] !== undefined && state.userAnswers[k] !== null;
        }).length;
    }

    function updateTimerFromDeadline(state) {
        var remaining = getRemainingSeconds(state);
        if (state.$['timer-display']) {
            state.$['timer-display'].textContent = formatTime(remaining);
            state.$['timer-display'].classList.remove('warning-yellow', 'warning-red');
            if (remaining <= 300 && remaining > 0) {
                state.$['timer-display'].classList.add('warning-red');
            } else if (remaining <= 600 && remaining > 0) {
                state.$['timer-display'].classList.add('warning-yellow');
            }
        }
        return remaining;
    }

    function getRemainingSeconds(state) {
        if (!state.deadline) return 0;
        return Math.max(0, Math.floor((state.deadline - Date.now()) / 1000));
    }

    function startTimerWithDeadline(state) {
        var now = Date.now();
        state.deadline = now + state.TOTAL_TIME_SECONDS * 1000;
        LSset(state.STORAGE_KEY_END_TIME, state.deadline.toString());
        LSset(state.STORAGE_KEY_START_TIME, now.toString());
        updateTimerFromDeadline(state);
        if (state.timerInterval) clearInterval(state.timerInterval);
        state.timerInterval = setInterval(function() {
            var remaining = updateTimerFromDeadline(state);
            if (remaining <= 0) {
                clearInterval(state.timerInterval);
                state.timerInterval = null;
                autoSubmit(state);
            }
        }, 1000);
    }

    function resumeTimerFromStoredDeadline(state) {
        var startStr = LSget(state.STORAGE_KEY_START_TIME);
        var endStr = LSget(state.STORAGE_KEY_END_TIME);
        if (startStr && endStr) {
            state.deadline = parseInt(endStr);
            var remaining = getRemainingSeconds(state);
            if (remaining > 0) {
                if (state.timerInterval) clearInterval(state.timerInterval);
                state.timerInterval = setInterval(function() {
                    var rem = updateTimerFromDeadline(state);
                    if (rem <= 0) {
                        clearInterval(state.timerInterval);
                        state.timerInterval = null;
                        autoSubmit(state);
                    }
                }, 1000);
                return true;
            }
        }
        return false;
    }

    function submitTest(state) {
        if (!state.testActive) return;
        state.testActive = false;
        if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; }
        disableTestRestrictions(state);
        unblockBackButton(state);
        var marks = calcMarks(state);
        var now = Date.now();
        var startStr = LSget(state.STORAGE_KEY_START_TIME);
        var start = startStr ? parseInt(startStr) : now;
        var timeTaken = Math.floor((now - start) / 1000);
        LSset(state.STORAGE_KEY_STATUS, 'completed');
        LSset(state.STORAGE_KEY_MARKS, marks.toString());
        LSset(state.STORAGE_KEY_SUBMITTED_AT, now.toString());
        LSset(state.STORAGE_KEY_ANSWERS, JSON.stringify(state.userAnswers));
        if (state.$['timer-display']) state.$['timer-display'].style.display = 'none';
        hideWarningModal(state);
        showResults(state, marks, timeTaken);
    }

    function autoSubmit(state) {
        if (!state.testActive && LSget(state.STORAGE_KEY_STATUS) === 'completed') return;
        state.testActive = false;
        if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; }
        disableTestRestrictions(state);
        unblockBackButton(state);
        var marks = calcMarks(state);
        var now = Date.now();
        var startStr = LSget(state.STORAGE_KEY_START_TIME);
        var start = startStr ? parseInt(startStr) : now;
        var timeTaken = Math.floor((now - start) / 1000);
        LSset(state.STORAGE_KEY_STATUS, 'completed');
        LSset(state.STORAGE_KEY_MARKS, marks.toString());
        LSset(state.STORAGE_KEY_SUBMITTED_AT, now.toString());
        LSset(state.STORAGE_KEY_ANSWERS, JSON.stringify(state.userAnswers));
        if (state.$['timer-display']) state.$['timer-display'].style.display = 'none';
        showResults(state, marks, timeTaken, true);
    }

    function calcMarks(state) {
        var correct = 0;
        for (var i = 0; i < state.TOTAL_QUESTIONS; i++) {
            if (state.userAnswers[i] === state.questionSet.questions[i].correct) correct++;
        }
        return correct;
    }

    function showWarningModal(state) {
        var unanswered = state.TOTAL_QUESTIONS - answeredCount(state);
        if (state.$['modal-unanswered-count']) {
            state.$['modal-unanswered-count'].textContent = unanswered + ' unanswered question(s)';
        }
        if (state.$['warning-modal']) {
            state.$['warning-modal'].style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    function hideWarningModal(state) {
        if (state.$['warning-modal']) {
            state.$['warning-modal'].style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    function enableTestRestrictions(state) {
        try {
            document.body.classList.add('test-active');
            document.addEventListener('copy', preventCopy);
            document.addEventListener('cut', preventCopy);
            document.addEventListener('contextmenu', function(e) { if (state.testActive) e.preventDefault(); });
            document.addEventListener('selectstart', function(e) { if (state.testActive) e.preventDefault(); });
        } catch (_) {}
    }

    function disableTestRestrictions(state) {
        try {
            document.body.classList.remove('test-active');
            document.removeEventListener('copy', preventCopy);
            document.removeEventListener('cut', preventCopy);
        } catch (_) {}
    }

    function preventCopy(e) {
        if (window._testActive) { e.preventDefault(); return false; }
    }

    function requestFullscreen() {
        var el = document.documentElement;
        if (el.requestFullscreen) { el.requestFullscreen().catch(function() {}); }
        else if (el.webkitRequestFullscreen) { el.webkitRequestFullscreen(); }
        else if (el.msRequestFullscreen) { el.msRequestFullscreen(); }
    }

    function blockBackButton(state) {
        window.history.pushState({ testActive: true }, '', location.href);
        window.addEventListener('popstate', function(e) {
            if (state.testActive) {
                window.location.href = 'https://arunpanthi.com.np/Psc-preparation/Mock-Test/General';
            }
        });
    }

    function unblockBackButton(state) {}

    // Export for use in other scripts
    window.resetTest = resetTest;

})();