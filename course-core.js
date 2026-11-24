(function () {
  const progressKey = 'unforte114-progress-v1';
  let progress = {};
  let useStorage = true;

  function loadProgress() {
    if (!useStorage) return;
    try { progress = JSON.parse(localStorage.getItem(progressKey)) || {}; }
    catch (_) { progress = {}; }
  }

  function unitProgress(unitId) {
    const saved = progress[unitId] || {};
    const tasks = Object.keys(window.CourseData.units[unitId].tasks);
    return {
      tasks: tasks.filter(task => Array.isArray(saved.tasks) && saved.tasks.includes(task)),
      reviewStars: [1, 2, 3].includes(saved.reviewStars) ? saved.reviewStars : 0
    };
  }

  function updateProgressDisplay() {
    const unitId = document.body.dataset.unit;
    const starValue = id => {
      const { tasks, reviewStars } = unitProgress(id);
      return tasks.length + reviewStars;
    };
    document.querySelectorAll('[data-course-unit-stars]').forEach(element => {
      element.textContent = `${starValue(element.dataset.courseUnitStars)} / 6 星`;
    });
    const total = document.querySelector('[data-course-progress-total]');
    if (total) {
      const stars = Object.keys(window.CourseData.units).reduce((sum, id) => sum + starValue(id), 0);
      total.textContent = `全課程 ${stars} / 24 星`;
    }
    if (!unitId) return;

    const { tasks, reviewStars } = unitProgress(unitId);
    document.querySelectorAll('[data-course-task]').forEach(item => {
      const done = tasks.includes(item.dataset.courseTask);
      item.classList.toggle('is-done', done);
      item.querySelector('[data-task-status]').textContent = done ? '已完成' : '待完成';
    });
    const labStars = document.querySelector('[data-course-lab-stars]');
    if (labStars) labStars.textContent = `實驗 ${tasks.length} / 3 星`;
    const best = document.querySelector('[data-review-best]');
    if (best) best.textContent = `最佳 ${reviewStars} / 3 星`;
  }

  function saveProgress(unitId, unit) {
    progress[unitId] = unit;
    if (useStorage) {
      try { localStorage.setItem(progressKey, JSON.stringify(progress)); }
      catch (_) { useStorage = false; }
    }
    updateProgressDisplay();
  }

  function completeTask(taskId) {
    const unitId = document.body.dataset.unit;
    if (!window.CourseData.units[unitId]?.tasks[taskId]) return;
    loadProgress();
    const unit = unitProgress(unitId);
    if (unit.tasks.includes(taskId)) return;
    unit.tasks.push(taskId);
    saveProgress(unitId, unit);
  }

  function recordReview(unitId, wrongAttempts) {
    const stars = Math.max(1, 3 - wrongAttempts);
    loadProgress();
    const unit = unitProgress(unitId);
    if (stars > unit.reviewStars) {
      unit.reviewStars = stars;
      saveProgress(unitId, unit);
    }
    return stars;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  }

  function getCourseData() {
    try { return JSON.parse(document.documentElement.dataset.courseData || '{}'); }
    catch (_) { return {}; }
  }

  function mountNavigation(config, unitId) {
    const nav = document.querySelector('[data-course-nav]');
    if (!nav || !Array.isArray(config.navigation)) return;
    nav.innerHTML = config.navigation.map(item => {
      const active = item.unit === unitId;
      const stateClass = active ? 'nav-active' : 'nav-inactive';
      return `<a href="${escapeHtml(item.href)}" class="nav-btn ${stateClass} shrink-0 whitespace-nowrap px-4 py-2.5 text-sm md:px-6 md:py-3 md:text-base font-bold"${active ? ' aria-current="page"' : ''}>${escapeHtml(item.label)}</a>`;
    }).join('');
  }

  function mountGoals(unit, unitId) {
    const section = document.querySelector('[data-course-goals]') || document.querySelector(`[aria-labelledby="unit-${unitId}-goals"]`);
    if (!section || !unit.goals) return;
    const { goals, theme } = unit;
    section.className = `course-goals course-theme-${theme}`;
    section.setAttribute('aria-labelledby', `unit-${unitId}-goals`);
    section.innerHTML = `<div class="course-goals-header"><div><p class="course-kicker">LEARNING GOALS</p><h3 id="unit-${unitId}-goals">${escapeHtml(goals.heading)}</h3></div><span class="course-goals-sequence">${escapeHtml(goals.sequence)}</span></div><ul class="course-goals-list">${goals.items.map((item, index) => `<li><span>${String(index + 1).padStart(2, '0')}</span>${escapeHtml(item)}</li>`).join('')}</ul>`;
  }

  function mountTasks(unit) {
    const goals = document.querySelector('[data-course-goals]');
    if (!goals || !unit.tasks) return;
    const tasks = Object.entries(unit.tasks).map(([id, label]) =>
      `<li data-course-task="${escapeHtml(id)}"><span>${escapeHtml(label)}</span><small data-task-status>待完成</small></li>`
    ).join('');
    goals.insertAdjacentHTML('afterend', `
      <section class="course-labs course-theme-${unit.theme}" aria-labelledby="course-labs-title">
        <div class="course-quiz-header">
          <div><h3 id="course-labs-title">本課實驗任務</h3><p>每完成一項得 1 星，另有快速檢核最多 3 星。</p></div>
          <span class="course-score" data-course-lab-stars aria-live="polite">實驗 0 / 3 星</span>
        </div>
        <ul class="course-lab-list">${tasks}</ul>
      </section>`);
  }

  function updateSteps(current) {
    const steps = [...document.querySelectorAll('[data-course-step]')];
    const pager = document.querySelector('[data-course-step-pager]');
    if (!pager) return;
    const index = steps.findIndex(step => step.dataset.courseStep === current);
    if (index < 0) return;
    steps.forEach((step, i) => {
      if (i === index) step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
    });
    const previous = pager.querySelector('[data-step-direction="-1"]');
    const next = pager.querySelector('[data-step-direction="1"]');
    const label = step => step.querySelector('strong').textContent;
    previous.hidden = index === 0;
    if (index > 0) previous.textContent = `← 上一步 · ${label(steps[index - 1])}`;
    next.textContent = index + 1 < steps.length ? `下一步 · ${label(steps[index + 1])} →` : '前往快速檢核 →';
  }

  function mountSteps() {
    const pager = document.querySelector('[data-course-step-pager]');
    if (!pager) return;
    updateSteps(document.querySelector('[data-course-step][aria-current]')?.dataset.courseStep);
    pager.hidden = false;
    pager.addEventListener('click', event => {
      const button = event.target.closest('[data-step-direction]');
      if (!button) return;
      const steps = [...document.querySelectorAll('[data-course-step]')];
      const current = steps.findIndex(step => step.hasAttribute('aria-current'));
      const next = steps[current + Number(button.dataset.stepDirection)];
      if (next) {
        next.click();
        next.focus();
      } else {
        document.querySelector('[data-course-quiz-heading]')?.focus();
      }
    });
  }

  function mountLessonNavigation(config, unitId, theme) {
    const lessons = config.navigation.filter(item => item.unit);
    const index = lessons.findIndex(item => item.unit === unitId);
    const link = (offset, label) => {
      const lesson = lessons[index + offset];
      return lesson ? `<a href="${escapeHtml(lesson.href)}">${label} · ${escapeHtml(config.units[lesson.unit].card.title)}</a>` : '';
    };
    document.querySelector('[data-course-review]')?.insertAdjacentHTML('afterend', `
      <nav class="course-pager course-theme-${theme}" aria-label="單元導覽">
        ${link(-1, '← 上一課')}
        ${link(1, '下一課 →') || '<a href="index.html">回到課程地圖 →</a>'}
      </nav>`);
  }

  function mountCourseMap(config) {
    const map = document.querySelector('[data-course-map]');
    if (!map || !config.units) return;
    const cardStyles = {
      blue: { card: 'course-card--binary border-blue-100', badge: 'bg-blue-100 text-blue-600', code: 'text-blue-600 bg-blue-50 border-blue-100', link: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
      indigo: { card: 'course-card--text border-indigo-100', badge: 'bg-indigo-100 text-indigo-600', code: 'text-indigo-600 bg-indigo-50 border-indigo-100', link: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100' },
      teal: { card: 'course-card--audio border-teal-100', badge: 'bg-teal-100 text-teal-600', code: 'text-teal-700 bg-teal-50 border-teal-100', link: 'bg-teal-50 text-teal-700 hover:bg-teal-100' },
      rose: { card: 'course-card--image border-rose-100', badge: 'bg-rose-100 text-rose-600', code: 'text-rose-600 bg-rose-50 border-rose-100', link: 'bg-rose-50 text-rose-700 hover:bg-rose-100' }
    };
    map.innerHTML = Object.entries(config.units).map(([unitId, unit]) => {
      const style = cardStyles[unit.theme];
      const card = unit.card;
      if (!style || !card) return '';
      return `<article class="course-card ${style.card} bg-white rounded-3xl p-5 border shadow-sm flex flex-col min-h-[245px]"><div class="flex items-start justify-between"><span class="w-12 h-12 rounded-2xl ${style.badge} flex items-center justify-center font-black text-lg">${String(unitId).padStart(2, '0')}</span><span class="font-mono-code text-xs ${style.code} border rounded-full px-2.5 py-1 font-bold">${escapeHtml(card.code)}</span></div><h3 class="mt-5 text-xl font-black text-slate-800">${escapeHtml(card.title)}</h3><p class="mt-2 text-sm text-slate-500 leading-relaxed">${escapeHtml(card.description)}</p><div class="mt-auto pt-4 course-map-actions"><a href="${unitId}.html" class="inline-flex items-center rounded-xl ${style.link} px-3 py-2 font-bold text-sm">開始單元 <span class="ml-2">→</span></a><span class="course-theme-${unit.theme} course-score" data-course-unit-stars="${unitId}">0 / 6 星</span></div></article>`;
    }).join('');
  }

  function mountLearningPath(config) {
    const path = document.querySelector('[data-learning-path]');
    if (!path || !config.units) return;
    path.innerHTML = Object.entries(config.units).map(([unitId, unit], index) => {
      const title = unit.card?.title;
      if (!title) return '';
      const leadStyle = index === 0 ? 'bg-white text-blue-600' : 'bg-white/20';
      const rowStyle = index === 0 ? 'bg-white/15 border-white/15' : 'bg-white/10 border-white/10';
      return `<a href="${unitId}.html" class="flex items-center gap-4 rounded-2xl ${rowStyle} px-4 py-3 border transition hover:bg-white/20"><span class="w-8 h-8 rounded-xl ${leadStyle} flex items-center justify-center font-black">${unitId}</span><span class="font-bold">${escapeHtml(title)}</span><span class="ml-auto text-blue-100">${String(unitId).padStart(2, '0')}</span></a>`;
    }).join('');
  }

  function mountEndOfUnit(unit, unitId) {
    const reviewSection = document.querySelector('[data-course-review]');
    if (!reviewSection || !unit.review || !unit.discussion) return;
    const { review, discussion, theme } = unit;
    const headingId = reviewSection.getAttribute('aria-labelledby');
    const questions = review.questions.map((item, questionIndex) => `<article class="course-question"><p>${escapeHtml(item.question)}</p><div class="course-choice-row">${item.choices.map((choice, choiceIndex) => `<button type="button" class="course-choice" data-review-question="${questionIndex}" data-review-choice="${choiceIndex}" aria-pressed="false">${escapeHtml(choice.label)}</button>`).join('')}</div></article>`).join('');
    reviewSection.className = `course-end-unit course-theme-${theme}`;
    reviewSection.innerHTML = `<div class="course-quiz-header"><div><p class="course-kicker">WRAP-UP</p><h3 id="${escapeHtml(headingId)}" class="mt-1 text-xl font-black text-slate-800">${escapeHtml(review.title)}</h3></div><a href="index.html" class="nav-btn nav-inactive w-fit px-4 py-2 text-sm font-bold">回到課程地圖</a></div><div class="course-reflections">${review.reflections.map(item => `<p class="course-reflection">${escapeHtml(item)}</p>`).join('')}</div><div class="course-quiz"><div class="course-quiz-header"><div><h4 data-course-quiz-heading tabindex="-1" class="font-black text-slate-800">快速檢核</h4><p class="text-xs text-slate-500">答對三題可獲得徽章。錯 0 次得 3 星，錯 1 次得 2 星，其餘得 1 星。</p></div><div class="course-review-scores"><span class="course-score" data-review-score>0 / ${review.questions.length}</span><span class="course-score" data-review-best>最佳 0 / 3 星</span></div></div><div class="course-questions">${questions}</div><p class="course-feedback" data-review-feedback aria-live="polite">從三題中找出你最需要再練習的概念。</p><div class="course-badge course-hidden" data-review-badge aria-live="polite">${escapeHtml(review.badge)}</div><button type="button" class="course-choice course-review-retry" data-review-retry hidden>再做一次</button></div><div class="course-discussion"><div class="course-discussion-header"><div><p class="course-kicker">PAIR TALK</p><h4 class="text-lg font-black text-slate-800">同伴討論挑戰</h4></div><span class="text-xs font-bold text-slate-500">先選擇，再說明理由</span></div><p class="mt-3 text-sm text-slate-600">${escapeHtml(discussion.scenario)}</p><div class="course-discussion-choices">${discussion.choices.map((choice, index) => `<button type="button" class="course-discussion-choice" data-discussion-choice="${index}" aria-pressed="false">${escapeHtml(choice)}</button>`).join('')}</div><p class="course-feedback" data-discussion-feedback aria-live="polite">選擇後，和同伴用「我選……因為……」說明你的理由。</p></div>`;
    document.querySelector('[data-course-discussion]')?.remove();

    const passedQuestions = new Set();
    let wrongAttempts = 0;
    reviewSection.addEventListener('click', event => {
      const reviewChoice = event.target.closest('[data-review-choice]');
      if (reviewChoice) {
        const questionIndex = Number(reviewChoice.dataset.reviewQuestion);
        if (passedQuestions.has(questionIndex)) return;
        const choice = review.questions[questionIndex].choices[Number(reviewChoice.dataset.reviewChoice)];
        const feedback = reviewSection.querySelector('[data-review-feedback]');
        if (choice.correct) {
          passedQuestions.add(questionIndex);
          reviewChoice.classList.add('is-correct');
          reviewChoice.setAttribute('aria-pressed', 'true');
          reviewChoice.closest('.course-question').querySelectorAll('button').forEach(button => button.setAttribute('aria-disabled', 'true'));
          feedback.textContent = `✅ 第 ${questionIndex + 1} 題答對了！`;
        } else {
          wrongAttempts++;
          reviewChoice.classList.add('is-wrong');
          feedback.textContent = `💡 ${choice.hint}`;
        }
        reviewSection.querySelector('[data-review-score]').textContent = `${passedQuestions.size} / ${review.questions.length}`;
        if (passedQuestions.size === review.questions.length) {
          const stars = recordReview(unitId, wrongAttempts);
          const badge = reviewSection.querySelector('[data-review-badge]');
          badge.textContent = `${review.badge} 本次獲得 ${stars} 星。`;
          badge.classList.remove('course-hidden');
          reviewSection.querySelector('[data-review-retry]').hidden = false;
        }
        return;
      }
      if (event.target.closest('[data-review-retry]')) {
        passedQuestions.clear();
        wrongAttempts = 0;
        reviewSection.querySelectorAll('[data-review-choice]').forEach(button => {
          button.classList.remove('is-correct', 'is-wrong');
          button.setAttribute('aria-pressed', 'false');
          button.removeAttribute('aria-disabled');
        });
        reviewSection.querySelector('[data-review-badge]').classList.add('course-hidden');
        reviewSection.querySelector('[data-review-retry]').hidden = true;
        reviewSection.querySelector('[data-review-score]').textContent = `0 / ${review.questions.length}`;
        reviewSection.querySelector('[data-review-feedback]').textContent = '選擇答案，重新挑戰三顆星。';
        reviewSection.querySelector('[data-review-choice]').focus();
        return;
      }
      const discussionChoice = event.target.closest('[data-discussion-choice]');
      if (discussionChoice) {
        reviewSection.querySelectorAll('[data-discussion-choice]').forEach(button => button.setAttribute('aria-pressed', 'false'));
        discussionChoice.setAttribute('aria-pressed', 'true');
        const choice = discussion.choices[Number(discussionChoice.dataset.discussionChoice)];
        reviewSection.querySelector('[data-discussion-feedback]').textContent = `你選擇「${choice}」。接著和同伴輪流完成：「我選這個，因為……」與「我同意／我有不同想法，因為……」。`;
      }
    });
  }

  function initializeCourseCore() {
    const config = getCourseData();
    const unitId = document.body.dataset.unit;
    const unit = config.units?.[unitId];
    if (!config.units) return;
    loadProgress();
    if (!unit) {
      mountCourseMap(config);
      mountLearningPath(config);
    } else {
      mountNavigation(config, unitId);
      mountGoals(unit, unitId);
      mountTasks(unit);
      mountEndOfUnit(unit, unitId);
      mountSteps();
      mountLessonNavigation(config, unitId, unit.theme);
    }
    updateProgressDisplay();
    window.addEventListener('pageshow', refreshProgress);
    window.addEventListener('storage', event => {
      if (event.key === progressKey || event.key === null) refreshProgress();
    });
  }

  function refreshProgress() {
    loadProgress();
    updateProgressDisplay();
  }

  if (document.body) initializeCourseCore();
  else document.addEventListener('DOMContentLoaded', initializeCourseCore);
  window.CourseCore = { initializeCourseCore, mountNavigation, mountGoals, mountCourseMap, mountLearningPath, mountEndOfUnit, completeTask, updateSteps };
})();
