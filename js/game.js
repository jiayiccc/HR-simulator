// ═══════════════════════════════════════════════
// 完蛋！我被HR包围了 — Game Logic
// ═══════════════════════════════════════════════

(function() {
  'use strict';

  // ── State ──
  const state = {
    currentNode: 'start',
    score: 100,
    turn: 0,
    history: [],
    isTyping: false,
  };

  // ── Probation State ──
  const probationState = {
    day: 1,
    score: 0,
    events: [],
    currentEventIndex: 0,
    history: [],
    finished: false,
    pendingEvent: null,
  };

  // ── DOM refs ──
  const scenes = {
    title: document.getElementById('scene-title'),
    door: document.getElementById('scene-door'),
    office: document.getElementById('scene-office'),
    computer: document.getElementById('scene-computer'),
    review: document.getElementById('scene-review'),
  };
  const chatMessages = document.getElementById('chat-messages');
  const chatChoices = document.getElementById('chat-choices');
  const statTurn = document.getElementById('stat-turn');
  const statScore = document.getElementById('stat-score');
  const scoreBar = document.getElementById('score-bar');
  const toast = document.getElementById('toast');
  const taskbarTime = document.getElementById('taskbar-time');

  // Module containers
  const moduleSalary = document.getElementById('module-salary');
  const moduleProbation = document.getElementById('module-probation');
  const modulePerformance = document.getElementById('module-performance');
  const sidebarItems = document.querySelectorAll('.sidebar-item[data-module]');

  // Performance DOM refs
  const performanceGrid = document.getElementById('performance-grid');
  const perfModal = document.getElementById('perf-modal');
  const perfModalIcon = document.getElementById('perf-modal-icon');
  const perfModalTitle = document.getElementById('perf-modal-title');
  const perfModalDesc = document.getElementById('perf-modal-desc');
  const perfModalLayman = document.getElementById('perf-modal-layman');
  const perfModalRelated = document.getElementById('perf-modal-related');
  const perfModalRelatedWrap = document.getElementById('perf-modal-related-wrap');

  // Probation DOM refs
  const probationDayEl = document.getElementById('probation-day');
  const probationProgressFill = document.getElementById('probation-progress-fill');
  const probationNotifications = document.getElementById('probation-notifications');
  const probationModal = document.getElementById('probation-modal');
  const modalIcon = document.getElementById('modal-icon');
  const modalTitle = document.getElementById('modal-title');
  const modalSubtitle = document.getElementById('modal-subtitle');
  const modalDesc = document.getElementById('modal-desc');
  const modalChoices = document.getElementById('modal-choices');
  const probationReview = document.getElementById('probation-review');

  // ═══════════════════════════════════════════════
  // SCENE MANAGEMENT
  // ═══════════════════════════════════════════════

  function switchScene(fromKey, toKey, delay = 600) {
    const from = scenes[fromKey];
    const to = scenes[toKey];
    if (!from || !to) return;
    from.classList.add('fading-out');
    setTimeout(() => {
      from.classList.remove('active', 'fading-out');
      to.classList.add('active');
    }, delay);
  }

  function showScene(key) {
    Object.values(scenes).forEach(s => s.classList.remove('active'));
    scenes[key].classList.add('active');
  }

  // ═══════════════════════════════════════════════
  // TOAST
  // ═══════════════════════════════════════════════

  let toastTimer = null;
  function showToast(text) {
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
  }

  // ═══════════════════════════════════════════════
  // CHAT SYSTEM
  // ═══════════════════════════════════════════════

  function addMessage(type, text, avatar) {
    const div = document.createElement('div');
    div.className = `msg msg-${type}`;
    if (type === 'hr' && avatar) {
      div.innerHTML = `<div class="msg-avatar">${avatar}</div>${escapeHtml(text)}`;
    } else {
      div.textContent = text;
    }
    chatMessages.appendChild(div);
    scrollChatToBottom();
    return div;
  }

  function addFeedback(text) {
    const div = document.createElement('div');
    div.className = 'msg msg-feedback';
    div.textContent = text;
    chatMessages.appendChild(div);
    scrollChatToBottom();
  }

  function addTypingIndicator() {
    const div = document.createElement('div');
    div.className = 'typing-indicator';
    div.id = 'typing-indicator';
    div.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
    chatMessages.appendChild(div);
    scrollChatToBottom();
  }

  function removeTypingIndicator() {
    const el = document.getElementById('typing-indicator');
    if (el) el.remove();
  }

  function scrollChatToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ── Typewriter effect for HR messages ──
  function typeWriter(element, text, speed) {
    speed = speed || 25;
    return new Promise(function(resolve) {
      var i = 0;
      element.textContent = '';
      function step() {
        if (i < text.length) {
          element.textContent += text.charAt(i);
          scrollChatToBottom();
          i++;
          setTimeout(step, speed);
        } else {
          resolve();
        }
      }
      step();
    });
  }

  // ═══════════════════════════════════════════════
  // DIALOGUE FLOW
  // ═══════════════════════════════════════════════

  async function playNode(nodeKey) {
    const node = DIALOGUE_TREE[nodeKey];
    if (!node) return;

    state.currentNode = nodeKey;
    state.isTyping = true;
    clearChoices();

    // Play HR messages with typing effect
    for (let i = 0; i < node.hr.length; i++) {
      addTypingIndicator();
      await delay(800 + Math.random() * 400);
      removeTypingIndicator();

      // Create HR message with avatar + text span
      const msgDiv = document.createElement('div');
      msgDiv.className = 'msg msg-hr';
      msgDiv.innerHTML = '<div class="msg-avatar">HR 小王</div><span class="msg-text"></span>';
      chatMessages.appendChild(msgDiv);
      await typeWriter(msgDiv.querySelector('.msg-text'), node.hr[i], 25);

      if (i < node.hr.length - 1) {
        await delay(400);
      }
    }

    state.isTyping = false;

    // Check if this is the end
    if (nodeKey === 'wrap_up') {
      await delay(600);
    }

    // Show choices
    if (node.choices[0].next === '__end__') {
      await delay(500);
      showReview();
      return;
    }

    showChoices(node.choices);
  }

  function showChoices(choices) {
    chatChoices.innerHTML = '';
    choices.forEach((choice, idx) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = choice.text;
      btn.addEventListener('click', () => handleChoice(choice));
      chatChoices.appendChild(btn);
      // Stagger animation
      btn.style.opacity = '0';
      btn.style.transform = 'translateY(8px)';
      setTimeout(() => {
        btn.style.transition = 'all 0.3s ease';
        btn.style.opacity = '1';
        btn.style.transform = 'translateY(0)';
      }, idx * 80);
    });
  }

  function clearChoices() {
    chatChoices.innerHTML = '';
  }

  async function handleChoice(choice) {
    if (state.isTyping) return;

    // Disable all choices
    document.querySelectorAll('.choice-btn').forEach(btn => btn.disabled = true);

    // Add player message
    addMessage('player', choice.text);

    // Update score
    const oldScore = state.score;
    state.score += choice.score;
    state.score = Math.max(0, Math.min(100, state.score));
    state.turn++;
    updateStats();

    // Record history
    state.history.push({
      turn: state.turn,
      choice: choice.text,
      scoreChange: choice.score,
      feedback: choice.feedback,
      finalScore: state.score,
    });

    // Show feedback
    await delay(400);
    if (choice.feedback) {
      addFeedback(choice.feedback);
      if (choice.score > 0) {
        showToast(`+${choice.score} 分`);
      } else if (choice.score < 0) {
        showToast(`${choice.score} 分`);
      }
    }

    await delay(800);

    // Go to next node
    if (choice.next === '__end__') {
      showReview();
    } else {
      playNode(choice.next);
    }
  }

  // ═══════════════════════════════════════════════
  // STATS UPDATE
  // ═══════════════════════════════════════════════

  function updateStats() {
    statTurn.textContent = state.turn;
    statScore.textContent = state.score;
    scoreBar.style.width = state.score + '%';

    // Color based on score
    if (state.score >= 80) {
      scoreBar.style.background = 'linear-gradient(90deg, #34c759, #22A5F7)';
    } else if (state.score >= 50) {
      scoreBar.style.background = 'linear-gradient(90deg, #f5c518, #ff9500)';
    } else {
      scoreBar.style.background = 'linear-gradient(90deg, #ff5f57, #ff3b30)';
    }
  }

  // ═══════════════════════════════════════════════
  // REVIEW SCREEN
  // ═══════════════════════════════════════════════

  function showReview() {
    const finalScore = state.score;
    let grade, gradeColor;
    if (finalScore >= 90) { grade = 'S'; gradeColor = '#22A5F7'; }
    else if (finalScore >= 75) { grade = 'A'; gradeColor = '#34c759'; }
    else if (finalScore >= 60) { grade = 'B'; gradeColor = '#f5c518'; }
    else if (finalScore >= 40) { grade = 'C'; gradeColor = '#ff9500'; }
    else { grade = 'D'; gradeColor = '#ff5f57'; }

    document.getElementById('final-score').textContent = finalScore;
    const gradeEl = document.getElementById('final-grade');
    gradeEl.textContent = grade;
    gradeEl.style.background = `linear-gradient(135deg, ${gradeColor}, ${gradeColor}aa)`;

    // Build review details
    const detailsEl = document.getElementById('review-details');
    detailsEl.innerHTML = '';
    state.history.forEach(h => {
      const item = document.createElement('div');
      const type = h.scoreChange > 5 ? 'good' : h.scoreChange < -5 ? 'bad' : 'neutral';
      item.className = `review-detail-item ${type}`;
      item.innerHTML = `
        <div class="detail-topic">第 ${h.turn} 轮 &mdash; ${h.scoreChange > 0 ? '+' : ''}${h.scoreChange} 分</div>
        <div class="detail-feedback">${escapeHtml(h.feedback)}</div>
      `;
      detailsEl.appendChild(item);
    });

    // Build tips
    const tipsEl = document.getElementById('review-tips');
    tipsEl.innerHTML = '<h3>📚 避坑知识点</h3>';
    REVIEW_KNOWLEDGE.forEach(k => {
      const tip = document.createElement('div');
      tip.className = 'tip-item';
      tip.innerHTML = `<strong>${k.topic}</strong>：${escapeHtml(k.tip)}<br><span style="color:#22A5F7;font-size:0.7rem;">📖 ${escapeHtml(k.law)}</span>`;
      tipsEl.appendChild(tip);
    });

    switchScene('computer', 'review', 400);
  }

  // ═══════════════════════════════════════════════
  // MODULE SWITCHING
  // ═══════════════════════════════════════════════

  let currentModule = 'salary';

  function switchModule(module) {
    if (module === currentModule && scenes.computer.classList.contains('active')) return;
    currentModule = module;

    sidebarItems.forEach(item => {
      if (item.dataset.module === module) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    if (module === 'salary') {
      moduleSalary.style.display = '';
      moduleProbation.style.display = 'none';
      modulePerformance.style.display = 'none';
    } else if (module === 'probation') {
      moduleSalary.style.display = 'none';
      moduleProbation.style.display = '';
      modulePerformance.style.display = 'none';
      if (probationState.events.length === 0) {
        startProbation();
      }
    } else if (module === 'performance') {
      moduleSalary.style.display = 'none';
      moduleProbation.style.display = 'none';
      modulePerformance.style.display = '';
      if (performanceGrid.children.length === 0) {
        renderPerformanceCards();
      }
    }
  }

  sidebarItems.forEach(item => {
    item.addEventListener('click', () => {
      if (item.classList.contains('disabled')) return;
      switchModule(item.dataset.module);
    });
  });

  function goHome() {
    // 回到薪资谈判界面（不回到标题画面）
    showScene('computer');
    switchModule('salary');
  }

  function backToComputer() {
    showScene('computer');
  }

  // ═══════════════════════════════════════════════
  // PROBATION MODULE LOGIC
  // ═══════════════════════════════════════════════

  // Desktop icon refs
  const desktopIcons = {
    email: document.querySelector('.desktop-icon[data-source="email"]'),
    group: document.querySelector('.desktop-icon[data-source="group"]'),
    worktalk: document.querySelector('.desktop-icon[data-source="worktalk"]'),
  };

  function startProbation() {
    probationState.day = 1;
    probationState.score = 0;
    probationState.currentEventIndex = 0;
    probationState.history = [];
    probationState.finished = false;
    probationState.pendingEvent = null;

    // Sort all events by day, pick 4
    const allEvents = Object.values(PROBATION_EVENTS).sort((a, b) => a.day - b.day);
    probationState.events = shuffleArray([...allEvents]).slice(0, 4);
    // Re-sort picked events by day
    probationState.events.sort((a, b) => a.day - b.day);

    // Clear UI
    clearAllBadges();
    probationNotifications.innerHTML = '';
    probationReview.style.display = 'none';
    probationModal.style.display = 'none';
    updateProbationDay();

    showToast('试用期开始了，注意查收消息！');
    // Trigger first event after delay
    setTimeout(() => {
      triggerNextEvent();
    }, 2000);
  }

  function clearAllBadges() {
    document.querySelectorAll('.icon-badge').forEach(b => b.remove());
  }

  function triggerNextEvent() {
    if (probationState.currentEventIndex >= probationState.events.length) return;
    const event = probationState.events[probationState.currentEventIndex];

    // Animate day to event's day
    advanceProbationDay(event.day, () => {
      // Show badge on the relevant desktop icon
      showIconBadge(event);
      showToast('你收到了一条新消息！');
    });
  }

  function showIconBadge(event) {
    probationState.pendingEvent = event;
    const source = event.source; // 'email', 'group', or 'worktalk'
    const iconEl = document.querySelector('.desktop-icon[data-source="' + source + '"]');
    if (!iconEl) return;

    // Remove existing badge
    const existing = iconEl.querySelector('.icon-badge');
    if (existing) existing.remove();

    const badge = document.createElement('div');
    badge.className = 'icon-badge';
    badge.textContent = '1';
    iconEl.style.position = 'relative';
    iconEl.appendChild(badge);

    // Add pulse animation
    iconEl.classList.add('has-notification');
  }

  // Handle desktop icon click
  document.querySelectorAll('.desktop-icon[data-source]').forEach(icon => {
    icon.addEventListener('click', () => {
      const source = icon.dataset.source;
      if (!probationState.pendingEvent || probationState.pendingEvent.source !== source) {
        showToast('暂时没有新消息');
        return;
      }
      // Remove badge
      const badge = icon.querySelector('.icon-badge');
      if (badge) badge.remove();
      icon.classList.remove('has-notification');

      // Open event
      openProbationEvent(probationState.pendingEvent);
    });
  });

  function openProbationEvent(event) {
    const modalBody = probationModal.querySelector('.probation-modal-body');

    if (event.isPayroll) {
      // Payroll event: show payslip table first
      openPayrollEvent(event);
    } else if (event.isEmail) {
      // Email event: show email interface
      openEmailEvent(event);
    } else if (event.isChat) {
      // Chat event: show chat messages
      openChatEvent(event);
    } else if (event.isGroupNotice) {
      // Group notice event
      openGroupEvent(event);
    } else {
      // Fallback: generic event
      modalIcon.textContent = event.icon;
      modalTitle.textContent = event.title;
      modalSubtitle.textContent = '第 ' + event.day + ' 天';
      modalDesc.textContent = event.desc;
      modalDesc.style.display = '';
      document.getElementById('modal-email-view').style.display = 'none';
      document.getElementById('modal-chat-view').style.display = 'none';
      document.getElementById('modal-followup-view').style.display = 'none';
      modalChoices.innerHTML = '';
      renderChoices(event.choices);
      probationModal.style.display = '';
    }
  }

  function openPayrollEvent(event) {
    modalIcon.textContent = event.icon;
    modalTitle.textContent = event.title;
    modalSubtitle.textContent = '第 ' + event.day + ' 天';
    modalDesc.style.display = 'none';
    document.getElementById('modal-email-view').style.display = 'none';
    document.getElementById('modal-chat-view').style.display = 'none';
    document.getElementById('modal-followup-view').style.display = 'none';
    modalChoices.innerHTML = '';

    const modalBody = probationModal.querySelector('.probation-modal-body');

    // Build payslip table
    const d = event.payrollData;
    const tableHtml = '\
      <div class="payslip">\
        <div class="payslip-header">10月工资条</div>\
        <table class="payslip-table">\
          <tr><td class="payslip-label">基本工资</td><td class="payslip-value">' + d.basePay.toLocaleString() + '</td></tr>\
          <tr><td class="payslip-label">绩效奖金</td><td class="payslip-value">' + d.performance.toLocaleString() + '</td></tr>\
          <tr><td class="payslip-label">补贴</td><td class="payslip-value">' + d.subsidy.toLocaleString() + '</td></tr>\
          <tr class="payslip-divider"><td colspan="2"></td></tr>\
          <tr><td class="payslip-label">应发合计</td><td class="payslip-value payslip-gross">' + d.grossPay.toLocaleString() + '</td></tr>\
          <tr><td class="payslip-label">社保扣款</td><td class="payslip-value payslip-zero">' + d.socialInsurance + '</td></tr>\
          <tr><td class="payslip-label">公积金扣款</td><td class="payslip-value payslip-zero">' + d.housingFund + '</td></tr>\
          <tr><td class="payslip-label">个人所得税</td><td class="payslip-value">' + d.tax + '</td></tr>\
          <tr class="payslip-divider"><td colspan="2"></td></tr>\
          <tr><td class="payslip-label payslip-total-label">实发工资</td><td class="payslip-value payslip-total">' + d.netPay.toLocaleString() + '</td></tr>\
        </table>\
      </div>\
      <div class="modal-intro-text">' + escapeHtml(event.introText) + '</div>';

    // Insert table before choices
    const introDiv = document.createElement('div');
    introDiv.innerHTML = tableHtml;
    modalBody.insertBefore(introDiv, modalChoices);

    // Show "给HR发邮件询问" button
    const askBtn = document.createElement('button');
    askBtn.className = 'modal-next-btn';
    askBtn.textContent = '给 HR 发邮件询问社保';
    askBtn.addEventListener('click', () => {
      introDiv.remove();
      askBtn.remove();
      showFollowUp(event);
    });
    modalChoices.appendChild(askBtn);

    probationModal.style.display = '';
  }

  function showFollowUp(event) {
    const fu = event.followUp;
    const followUpView = document.getElementById('modal-followup-view');
    followUpView.style.display = '';
    followUpView.innerHTML = '\
      <div class="followup-chat">\
        <div class="followup-msg followup-me">\
          <div class="followup-avatar">我</div>\
          <div class="followup-bubble">您好，我查看了工资条，发现社保和公积金扣款都是0，想确认一下是什么情况？</div>\
        </div>\
        <div class="followup-msg followup-hr">\
          <div class="followup-avatar">HR</div>\
          <div class="followup-bubble">' + escapeHtml(fu.message) + '</div>\
        </div>\
      </div>\
      <div class="followup-prompt">' + escapeHtml(fu.questionPrompt) + '</div>';
    modalChoices.innerHTML = '';
    renderChoices(fu.choices);

    // Scroll followup into view
    followUpView.scrollIntoView({ behavior: 'smooth' });
  }

  function openEmailEvent(event) {
    modalIcon.textContent = event.icon;
    modalTitle.textContent = event.title;
    modalSubtitle.textContent = '第 ' + event.day + ' 天';
    modalDesc.style.display = 'none';
    document.getElementById('modal-chat-view').style.display = 'none';
    document.getElementById('modal-followup-view').style.display = 'none';
    modalChoices.innerHTML = '';

    const emailView = document.getElementById('modal-email-view');
    emailView.style.display = '';
    const ed = event.emailData;
    emailView.innerHTML = '\
      <div class="modal-intro-text">' + escapeHtml(event.introText) + '</div>\
      <div class="email-view">\
        <div class="email-subject">' + escapeHtml(ed.subject) + '</div>\
        <div class="email-meta">\
          <span>发件人: ' + escapeHtml(ed.from) + '</span>\
          <span>时间: ' + ed.time + '</span>\
        </div>\
        <div class="email-body">' + escapeHtml(ed.body).replace(/\n/g, '<br>') + '</div>\
      </div>';

    renderChoices(event.choices);
    probationModal.style.display = '';
  }

  function openChatEvent(event) {
    modalIcon.textContent = event.icon;
    modalTitle.textContent = event.title;
    modalSubtitle.textContent = '第 ' + event.day + ' 天';
    modalDesc.style.display = 'none';
    document.getElementById('modal-email-view').style.display = 'none';
    document.getElementById('modal-followup-view').style.display = 'none';
    modalChoices.innerHTML = '';

    const chatView = document.getElementById('modal-chat-view');
    chatView.style.display = '';
    const cd = event.chatData;
    let msgsHtml = '<div class="modal-intro-text">' + escapeHtml(event.introText) + '</div><div class="worktalk-view">';
    cd.messages.forEach(msg => {
      msgsHtml += '<div class="worktalk-msg"><div class="worktalk-avatar">' + cd.avatar + '</div><div class="worktalk-bubble">' + escapeHtml(msg) + '</div></div>';
    });
    msgsHtml += '</div>';
    chatView.innerHTML = msgsHtml;

    renderChoices(event.choices);
    probationModal.style.display = '';
  }

  function openGroupEvent(event) {
    modalIcon.textContent = event.icon;
    modalTitle.textContent = event.title;
    modalSubtitle.textContent = '第 ' + event.day + ' 天';
    modalDesc.style.display = 'none';
    document.getElementById('modal-email-view').style.display = 'none';
    document.getElementById('modal-chat-view').style.display = 'none';
    document.getElementById('modal-followup-view').style.display = 'none';
    modalChoices.innerHTML = '';

    const gd = event.groupData;
    const groupHtml = '\
      <div class="modal-intro-text">' + escapeHtml(event.introText) + '</div>\
      <div class="group-view">\
        <div class="group-name">' + escapeHtml(gd.groupName) + '</div>\
        <div class="group-msg">\
          <div class="group-sender">' + escapeHtml(gd.sender) + '</div>\
          <div class="group-text">' + escapeHtml(gd.message) + '</div>\
        </div>\
      </div>';
    const introDiv = document.createElement('div');
    introDiv.innerHTML = groupHtml;
    const modalBodyEl = probationModal.querySelector('.probation-modal-body');
    modalBodyEl.insertBefore(introDiv, modalChoices);

    renderChoices(event.choices);
    probationModal.style.display = '';
  }

  function renderChoices(choices) {
    choices.forEach((choice, idx) => {
      const btn = document.createElement('button');
      btn.className = 'modal-choice-btn';
      btn.textContent = choice.text;
      btn.addEventListener('click', () => handleProbationChoice(choice, probationState.pendingEvent));
      modalChoices.appendChild(btn);
      btn.style.opacity = '0';
      btn.style.transform = 'translateY(8px)';
      setTimeout(() => {
        btn.style.transition = 'all 0.3s ease';
        btn.style.opacity = '1';
        btn.style.transform = 'translateY(0)';
      }, idx * 80);
    });
  }

  function advanceProbationDay(targetDay, callback) {
    if (probationState.finished) return;
    const startDay = probationState.day;
    const duration = 800;
    const startTime = Date.now();
    function animate() {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      probationState.day = Math.round(startDay + (targetDay - startDay) * t);
      updateProbationDay();
      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        if (callback) callback();
      }
    }
    animate();
  }

  function updateProbationDay() {
    probationDayEl.textContent = probationState.day;
    const progress = Math.min((probationState.day / 90) * 100, 100);
    probationProgressFill.style.width = progress + '%';
  }

  async function handleProbationChoice(choice, event) {
    document.querySelectorAll('.modal-choice-btn').forEach(btn => btn.disabled = true);

    probationState.score += choice.score;
    probationState.score = Math.max(0, Math.min(100, probationState.score));

    probationState.history.push({
      eventTitle: event.title,
      choice: choice.text,
      scoreChange: choice.score,
      feedback: choice.feedback,
    });

    // Show feedback
    const feedbackDiv = document.createElement('div');
    const type = choice.score > 10 ? 'good' : choice.score < 0 ? 'bad' : 'neutral';
    feedbackDiv.className = 'modal-feedback ' + type;
    feedbackDiv.textContent = choice.feedback;
    modalChoices.appendChild(feedbackDiv);

    if (choice.score > 0) showToast('+' + choice.score + ' 分');
    else if (choice.score < 0) showToast(choice.score + ' 分');

    // Clean up any extra inserted content (payslip, email view, etc.)
    const modalBodyEl = probationModal.querySelector('.probation-modal-body');
    // Remove any dynamic content divs that were inserted before modalChoices, except modal-desc
    const extraDivs = modalBodyEl.querySelectorAll(':scope > div:not(.modal-desc):not(#modal-email-view):not(#modal-chat-view):not(#modal-followup-view):not(.modal-choices)');
    extraDivs.forEach(d => d.remove());
    // Reset views
    document.getElementById('modal-email-view').style.display = 'none';
    document.getElementById('modal-chat-view').style.display = 'none';
    document.getElementById('modal-followup-view').style.display = 'none';

    // Add continue button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'modal-next-btn';
    nextBtn.textContent = '继续';
    nextBtn.addEventListener('click', () => {
      probationModal.style.display = 'none';
      modalDesc.style.display = '';
      probationState.currentEventIndex++;
      probationState.pendingEvent = null;

      if (probationState.currentEventIndex >= probationState.events.length) {
        advanceProbationDay(90, () => {
          setTimeout(() => showProbationReview(), 500);
        });
      } else {
        setTimeout(() => triggerNextEvent(), 1000);
      }
    });
    modalChoices.appendChild(nextBtn);
  }

  function showProbationReview() {
    probationState.finished = true;
    const finalScore = Math.round(probationState.score / (probationState.events.length * 25) * 100);
    let grade, gradeColor;
    if (finalScore >= 90) { grade = 'S'; gradeColor = '#22A5F7'; }
    else if (finalScore >= 75) { grade = 'A'; gradeColor = '#34c759'; }
    else if (finalScore >= 60) { grade = 'B'; gradeColor = '#f5c518'; }
    else if (finalScore >= 40) { grade = 'C'; gradeColor = '#ff9500'; }
    else { grade = 'D'; gradeColor = '#ff5f57'; }

    document.getElementById('probation-final-score').textContent = finalScore;
    const gradeEl = document.getElementById('probation-final-grade');
    gradeEl.textContent = grade;
    gradeEl.style.background = 'linear-gradient(135deg, ' + gradeColor + ', ' + gradeColor + 'aa)';

    const detailsEl = document.getElementById('probation-review-details');
    detailsEl.innerHTML = '';
    probationState.history.forEach(h => {
      const item = document.createElement('div');
      const type = h.scoreChange > 10 ? 'good' : h.scoreChange < 0 ? 'bad' : 'neutral';
      item.className = 'review-detail-item ' + type;
      item.innerHTML = '<div class="detail-topic">' + escapeHtml(h.eventTitle) + ' — ' + (h.scoreChange > 0 ? '+' : '') + h.scoreChange + ' 分</div><div class="detail-feedback">' + escapeHtml(h.feedback) + '</div>';
      detailsEl.appendChild(item);
    });

    const tipsEl = document.getElementById('probation-review-tips');
    tipsEl.innerHTML = '<h3>📚 避坑知识点</h3>';
    PROBATION_KNOWLEDGE.forEach(k => {
      const tip = document.createElement('div');
      tip.className = 'tip-item';
      tip.innerHTML = '<strong>' + k.topic + '</strong>：' + escapeHtml(k.tip) + '<br><span style="color:#22A5F7;font-size:0.7rem;">📖 ' + escapeHtml(k.law) + '</span>';
      tipsEl.appendChild(tip);
    });

    probationReview.style.display = '';
  }

  function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ═══════════════════════════════════════════════
  // PERFORMANCE MODULE LOGIC
  // ═══════════════════════════════════════════════

  const PERFORMANCE_CARDS = [
    // Layer 1: 核心概念
    {
      id: 'perf_what',
      icon: '📊',
      title: '绩效考核是什么',
      summary: '公司怎么评价你干得好不好',
      layer: 1,
      desc: '绩效考核是企业定期评估员工工作表现的管理机制。通常包括目标设定、过程跟踪、结果评估和反馈改进四个环节。考核结果直接影响你的奖金、晋升和职业发展。',
      layman: '说白了，就是公司给你打分。打得好多发钱，打得不好可能被优化。',
      related: ['perf_kpi_okr', 'perf_grades'],
    },
    {
      id: 'perf_kpi_okr',
      icon: '🎯',
      title: 'KPI vs OKR',
      summary: '两种考核方式，一个看结果一个看过程',
      layer: 1,
      desc: 'KPI（关键绩效指标）是「你必须完成什么」，侧重结果量化；OKR（目标与关键成果）是「你要达成什么目标」，侧重方向对齐。KPI 完不成要扣钱，OKR 完不成可以调整。国内大部分公司名义上用 OKR，实际执行的是 KPI。',
      layman: 'KPI = 考卷上有标准答案，OKR = 你自己定目标自己打分。',
      related: ['perf_what', 'perf_grades'],
    },
    {
      id: 'perf_grades',
      icon: '📈',
      title: '绩效等级与强制分布',
      summary: 'S/A/B/C/D 是什么意思，强制分布是什么套路',
      layer: 1,
      desc: '绩效等级通常分为 S（卓越）、A（优秀）、B（良好）、C（待改进）、D（不合格）。强制分布（Forced Ranking）要求每个等级必须有固定比例，比如 S 和 A 总共不超过 30%，C 和 D 至少 10%。这意味着即使全员表现都不错，也总有人要拿低分。',
      layman: '强制分布就是「必须有倒数」，跟考试成绩没关系，跟排名有关系。',
      related: ['perf_what', 'perf_kpi_okr', 'perf_bonus'],
    },
    {
      id: 'perf_bonus',
      icon: '💰',
      title: '绩效奖金计算',
      summary: '你的年终奖到底是怎么算出来的',
      layer: 1,
      desc: '绩效奖金的计算公式通常是：奖金基数 x 绩效系数 x 部门/公司系数。基数一般写在合同里（比如2个月工资），绩效系数由你的等级决定（S=1.5, A=1.2, B=1.0, C=0.5, D=0），公司系数根据整体业绩浮动。很多公司说的「13薪」「14薪」其实只有绩效达标才能拿满。',
      layman: '合同写14薪不代表你一定拿14个月的钱。绩效拿C可能只有10薪。',
      related: ['perf_grades', 'salary_structure'],
    },
    // Layer 2: 合同与劳动法基础
    {
      id: 'salary_structure',
      icon: '🧾',
      title: '薪资构成详解',
      summary: 'base、绩效、补贴，合同上该怎么写',
      layer: 2,
      desc: '薪资应该分项写明：基本工资（base）、绩效奖金、各类补贴（餐补/交通/通讯）。其中基本工资是「落袋为安」的部分，受法律保护；绩效奖金是「画饼区」，公司可以各种理由不发。合同上必须分开写明，否则一旦劳动仲裁，模糊的「打包价」对你非常不利。',
      layman: 'base 是保底的，绩效是画饼的。合同上不分开写，仲裁时你吃亏。',
      related: ['perf_bonus', 'contract_basics'],
    },
    {
      id: 'contract_basics',
      icon: '📝',
      title: '劳动合同必看条款',
      summary: '签合同前必须逐条确认的7个关键点',
      layer: 2,
      desc: '劳动合同必须包含：1.薪资构成（分项写明）2.工作地点和岗位 3.工作时间（标准工时/综合工时/不定时工时）4.试用期期限和薪资 5.社保和公积金条款 6.竞业限制和保密协议 7.违约金条款。特别注意：口头承诺无效，一切以书面合同为准。签完合同后自己保留一份原件。',
      layman: '合同是你在公司唯一的护身符。没写进合同的东西，等于不存在。',
      related: ['salary_structure', 'social_insurance_rules'],
    },
    {
      id: 'social_insurance_rules',
      icon: '🏥',
      title: '五险一金全解析',
      summary: '每一个险种保什么，公积金有什么用',
      layer: 2,
      desc: '五险：养老（退休后按月领钱）、医疗（看病报销）、失业（非自愿失业可领）、工伤（工作受伤赔偿）、生育（产检/分娩报销）。一金：住房公积金，用于买房贷款，公司和员工各缴一部分，全部进入你的个人账户。缴费基数应该是你的实际工资，很多公司按最低基数缴纳来省钱。',
      layman: '五险是国家的安全网，公积金是你的买房基金。按最低基数交 = 公司在偷你的钱。',
      related: ['contract_basics'],
    },
    // Layer 3: 维权与应对
    {
      id: 'labor_dispute',
      icon: '⚖️',
      title: '劳动仲裁入门',
      summary: '和公司闹翻了怎么办，仲裁流程是什么',
      layer: 3,
      desc: '劳动仲裁是解决劳动争议的第一步（不需要请律师，不收费）。流程：1.收集证据（合同、工资条、聊天记录、邮件）2.向公司所在地的劳动仲裁委员会提交申请 3.受理后45-60天内开庭 4.对裁决不服可在15天内起诉到法院。关键证据：书面材料 > 电子证据 > 证人证言。',
      layman: '仲裁不花钱，不用律师。但证据是你赢的唯一依靠，日常就要养成截图保存的习惯。',
      related: ['evidence_guide'],
    },
    {
      id: 'evidence_guide',
      icon: '📁',
      title: '职场证据收集指南',
      summary: '哪些东西要留，怎么留才有效',
      layer: 3,
      desc: '关键证据类型：1.劳动合同（原件）2.工资条/银行流水（证明薪资）3.考勤记录（证明工时）4.工作群聊天记录（截图+录屏）5.邮件往来（转发到个人邮箱）6.绩效评估表（拍照/复印）。注意：电子证据需要证明真实性，最佳做法是把重要聊天转发到自己私人邮箱，截图时带上时间戳。',
      layman: '把所有重要的东西抄送一份到你自己的邮箱。这是最省事也最有效的证据保存方式。',
      related: ['labor_dispute', 'contract_basics'],
    },
  ];

  const perfState = {
    readCards: new Set(),
  };

  function renderPerformanceCards() {
    performanceGrid.innerHTML = '';
    PERFORMANCE_CARDS.forEach((card, idx) => {
      const isRead = perfState.readCards.has(card.id);
      const el = document.createElement('div');
      el.className = 'kg-card';
      el.style.animationDelay = (idx * 0.1) + 's';
      el.innerHTML = `
        <div class="kg-card-layer">L${card.layer}</div>
        <div class="kg-card-icon">${card.icon}</div>
        <div class="kg-card-title">${card.title}</div>
        <div class="kg-card-summary">${card.summary}</div>
        ${isRead ? '<div class="kg-card-read">✓ 已读</div>' : ''}
      `;
      el.addEventListener('click', () => openPerfCard(card));
      performanceGrid.appendChild(el);
    });
  }

  function openPerfCard(card) {
    perfModalIcon.textContent = card.icon;
    perfModalTitle.textContent = card.title;
    perfModalDesc.textContent = card.desc;
    perfModalLayman.textContent = card.layman;

    // Related cards
    perfModalRelated.innerHTML = '';
    if (card.related && card.related.length > 0) {
      perfModalRelatedWrap.style.display = '';
      card.related.forEach(relId => {
        const relCard = PERFORMANCE_CARDS.find(c => c.id === relId);
        if (!relCard) return;
        const btn = document.createElement('div');
        btn.className = 'perf-related-card';
        btn.textContent = relCard.title;
        btn.addEventListener('click', () => openPerfCard(relCard));
        perfModalRelated.appendChild(btn);
      });
    } else {
      perfModalRelatedWrap.style.display = 'none';
    }

    perfModal.style.display = '';
    perfState.readCards.add(card.id);
  }

  document.getElementById('perf-modal-close').addEventListener('click', () => {
    perfModal.style.display = 'none';
    renderPerformanceCards(); // refresh to show "read" badges
  });

  // ═══════════════════════════════════════════════
  // GAME FLOW — Scene transitions
  // ═══════════════════════════════════════════════

  // Title → Door
  document.getElementById('btn-start').addEventListener('click', () => {
    switchScene('title', 'door');
  });

  // Door click → open door → Office
  const door = document.getElementById('game-door');
  let doorClicked = false;
  door.addEventListener('click', () => {
    if (doorClicked) return;
    doorClicked = true;
    door.classList.add('opening');
    showToast('推门进入...');
    setTimeout(() => {
      switchScene('door', 'office');
    }, 1300);
  });

  // Monitor click → boot → Computer
  const monitor = document.getElementById('game-monitor');
  let monitorClicked = false;
  monitor.addEventListener('click', () => {
    if (monitorClicked) return;
    monitorClicked = true;
    // Wait for boot animation
    setTimeout(() => {
      switchScene('office', 'computer');
      // Start dialogue after scene transition
      setTimeout(() => {
        resetGame();
        playNode('start');
      }, 800);
    }, 3000);
  });

  // Replay — salary module (back to computer, switch to salary)
  document.getElementById('btn-replay').addEventListener('click', () => {
    showScene('computer');
    moduleSalary.style.display = '';
    moduleProbation.style.display = 'none';
    modulePerformance.style.display = 'none';
    sidebarItems.forEach(item => {
      item.classList.remove('active');
      if (item.dataset.module === 'salary') item.classList.add('active');
    });
    currentModule = 'salary';
    resetGame();
    playNode('start');
  });

  // Replay — probation module
  document.getElementById('btn-probation-replay').addEventListener('click', () => {
    probationReview.style.display = 'none';
    startProbation();
  });

  // Module back buttons (in probation and performance headers)
  document.querySelectorAll('.module-back-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.back || 'salary';
      switchModule(target);
    });
  });

  // ═══════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════

  function resetGame() {
    state.currentNode = 'start';
    state.score = 100;
    state.turn = 0;
    state.history = [];
    state.isTyping = false;
    chatMessages.innerHTML = '';
    updateStats();
  }

  function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    taskbarTime.textContent = `${h}:${m}`;
  }

  // ── Utils ──
  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Init
  updateClock();
  setInterval(updateClock, 30000);
  showScene('title');

  console.log('🎮 完蛋！我被HR包围了 — Game Loaded');
})();