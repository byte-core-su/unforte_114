(function () {
  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  }

  function mountEndOfUnit(unitId) {
    const unit = window.CourseData?.[unitId];
    const reviewSection = document.querySelector(`[aria-labelledby="unit-${unitId}-review"]`);
    if (!unit || !reviewSection) return;
    const { review, discussion, theme } = unit;
    const questions = review.questions.map((item, questionIndex) => `<article class="course-question"><p>${escapeHtml(item.question)}</p><div class="course-choice-row">${item.choices.map((choice, choiceIndex) => `<button type="button" class="course-choice" data-review-question="${questionIndex}" data-review-choice="${choiceIndex}" aria-pressed="false">${escapeHtml(choice.label)}</button>`).join('')}</div></article>`).join('');
    reviewSection.className = `course-end-unit course-theme-${theme}`;
    reviewSection.innerHTML = `<div class="course-quiz-header"><div><p class="course-kicker">WRAP-UP</p><h3 class="mt-1 text-xl font-black text-slate-800">${escapeHtml(review.title)}</h3></div><a href="index.html" class="nav-btn nav-inactive w-fit px-4 py-2 text-sm font-bold">回到課程地圖</a></div><div class="course-reflections">${review.reflections.map(item => `<p class="course-reflection">${escapeHtml(item)}</p>`).join('')}</div><div class="course-quiz"><div class="course-quiz-header"><div><h4 class="font-black text-slate-800">快速檢核</h4><p class="text-xs text-slate-500">答對三題，取得本單元徽章。</p></div><span class="course-score" data-review-score>0 / ${review.questions.length}</span></div><div class="course-questions">${questions}</div><p class="course-feedback" data-review-feedback aria-live="polite">從三題中找出你最需要再練習的概念。</p><div class="course-badge course-hidden" data-review-badge>${escapeHtml(review.badge)}</div></div><div class="course-discussion"><div class="course-discussion-header"><div><p class="course-kicker">PAIR TALK</p><h4 class="text-lg font-black text-slate-800">同伴討論挑戰</h4></div><span class="text-xs font-bold text-slate-500">先選擇，再說明理由</span></div><p class="mt-3 text-sm text-slate-600">${escapeHtml(discussion.scenario)}</p><div class="course-discussion-choices">${discussion.choices.map((choice, index) => `<button type="button" class="course-discussion-choice" data-discussion-choice="${index}" aria-pressed="false">${escapeHtml(choice)}</button>`).join('')}</div><p class="course-feedback" data-discussion-feedback aria-live="polite">選擇後，和同伴用「我選……因為……」說明你的理由。</p></div>`;
    document.querySelector(`[aria-labelledby="unit-${unitId}-discussion"]`)?.remove();

    const passedQuestions = new Set();
    reviewSection.addEventListener('click', event => {
      const reviewChoice = event.target.closest('[data-review-choice]');
      if (reviewChoice) {
        const questionIndex = Number(reviewChoice.dataset.reviewQuestion);
        const choice = review.questions[questionIndex].choices[Number(reviewChoice.dataset.reviewChoice)];
        const feedback = reviewSection.querySelector('[data-review-feedback]');
        if (choice.correct) {
          passedQuestions.add(questionIndex);
          reviewChoice.classList.add('is-correct');
          reviewChoice.setAttribute('aria-pressed', 'true');
          feedback.textContent = `✅ 第 ${questionIndex + 1} 題答對了！`;
        } else {
          reviewChoice.classList.add('is-wrong');
          feedback.textContent = `💡 ${choice.hint}`;
        }
        reviewSection.querySelector('[data-review-score]').textContent = `${passedQuestions.size} / ${review.questions.length}`;
        if (passedQuestions.size === review.questions.length) reviewSection.querySelector('[data-review-badge]').classList.remove('course-hidden');
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
    if (!window.CourseData) {
      window.addEventListener('load', initializeCourseCore, { once: true });
      return;
    }
    mountEndOfUnit(document.body.dataset.unit);
  }

  if (document.body) initializeCourseCore();
  else document.addEventListener('DOMContentLoaded', initializeCourseCore);
  window.CourseCore = { mountEndOfUnit };
})();
