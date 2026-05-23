/* ============================================================
   FuSang Vision Portal — Frontend Logic
   ============================================================ */

(function () {
  'use strict';

  // ============================================================
  // Configuration
  // ============================================================

  const API_URL = 'https://ziwei-api-dev-354233566852.asia-east1.run.app/calculate';
  const API_TIMEOUT_MS = 300000; // 5 minutes (排盤 + 寫入可能要 1-2 分鐘)

  // ============================================================
  // DOM helpers
  // ============================================================

  const $ = (id) => document.getElementById(id);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ============================================================
  // Initialize form
  // ============================================================

  function initYearOptions() {
    const sel = $('s_year');
    const currentYear = new Date().getFullYear();
    // 範圍：1920 ~ 當前年
    for (let y = currentYear; y >= 1920; y--) {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      sel.appendChild(opt);
    }
  }

  function initMonthOptions() {
    const sel = $('s_month');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    months.forEach((m, i) => {
      const opt = document.createElement('option');
      opt.value = i + 1;
      opt.textContent = m;
      sel.appendChild(opt);
    });
  }

  function initDayOptions() {
    const sel = $('s_day');
    for (let d = 1; d <= 31; d++) {
      const opt = document.createElement('option');
      opt.value = d;
      opt.textContent = d;
      sel.appendChild(opt);
    }
  }

  // Adjust day options based on year/month
  function updateDayOptions() {
    const year = parseInt($('s_year').value, 10);
    const month = parseInt($('s_month').value, 10);
    if (!year || !month) return;

    const daysInMonth = new Date(year, month, 0).getDate();
    const sel = $('s_day');
    const currentDay = parseInt(sel.value, 10);

    // Rebuild day options
    sel.innerHTML = '<option value="">Day</option>';
    for (let d = 1; d <= daysInMonth; d++) {
      const opt = document.createElement('option');
      opt.value = d;
      opt.textContent = d;
      sel.appendChild(opt);
    }

    // Restore selection if still valid
    if (currentDay && currentDay <= daysInMonth) {
      sel.value = currentDay;
    }
  }

  // ============================================================
  // Toggle buttons (gender / language)
  // ============================================================

  function initToggleGroups() {
    $$('.toggle-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const name = btn.dataset.name;
        const value = btn.dataset.value;

        // Deactivate siblings
        $$(`.toggle-btn[data-name="${name}"]`).forEach((sibling) => {
          sibling.classList.remove('active');
          sibling.setAttribute('aria-pressed', 'false');
        });

        // Activate clicked
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');

        // Sync hidden input
        $(name).value = value;
      });
    });
  }

  // ============================================================
  // View switching
  // ============================================================

  function showView(viewId) {
    $$('.view').forEach((v) => v.classList.remove('view-active'));
    $(viewId).classList.add('view-active');
    // Scroll to top for new view
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ============================================================
  // Loading animation: cycle through steps
  // ============================================================

  let loadingTimer = null;

  function startLoadingAnimation() {
    const steps = $$('#view-loading .step');
    let current = 0;

    // Reset all
    steps.forEach((s) => s.classList.remove('done', 'active'));
    if (steps[0]) steps[0].classList.add('active');

    // Cycle through steps every ~12 seconds (about half typical duration)
    loadingTimer = setInterval(() => {
      if (current < steps.length - 1) {
        steps[current].classList.remove('active');
        steps[current].classList.add('done');
        current++;
        steps[current].classList.add('active');
      }
    }, 12000);
  }

  function stopLoadingAnimation() {
    if (loadingTimer) {
      clearInterval(loadingTimer);
      loadingTimer = null;
    }
    // Mark all as done
    $$('#view-loading .step').forEach((s) => {
      s.classList.remove('active');
      s.classList.add('done');
    });
  }

  // ============================================================
  // Form validation
  // ============================================================

  function showError(message) {
    const el = $('error-message');
    el.textContent = message;
    el.classList.add('active');
  }

  function clearError() {
    const el = $('error-message');
    el.textContent = '';
    el.classList.remove('active');
  }

  function validateForm(data) {
    if (!data.user_name || data.user_name.trim().length < 1) {
      return 'Please enter your name.';
    }
    if (!data.user_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.user_email)) {
      return 'Please enter a valid email address.';
    }
    if (!data.s_year || !data.s_month || !data.s_day) {
      return 'Please select your full date of birth.';
    }
    if (!data.hour_num) {
      return 'Please select your birth hour.';
    }
    if (data.gender === '' || data.gender === undefined || data.gender === null) {
      return 'Please select your gender.';
    }
    if (!data.report_lang) {
      return 'Please select your report language.';
    }
    if (!data.newsletter_consent) {
      return 'Newsletter consent is required to receive your report.';
    }
    return null; // valid
  }

  // ============================================================
  // API call
  // ============================================================

  async function submitChartRequest(data) {
    // Build FormData (FastAPI Form expects multipart/form-data)
    const formData = new FormData();
    formData.append('user_name', data.user_name);
    formData.append('user_email', data.user_email);
    formData.append('s_year', data.s_year);
    formData.append('s_month', data.s_month);
    formData.append('s_day', data.s_day);
    formData.append('hour_num', data.hour_num);
    formData.append('gender', data.gender);
    formData.append('report_lang', data.report_lang);

    // Timeout via AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const result = await response.json();

      if (!response.ok) {
        // API responded with error status
        throw new Error(result.message || `Server error (${response.status})`);
      }

      return result;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Request timed out. The server may be busy. Please try again.');
      }
      throw err;
    }
  }

  // ============================================================
  // Success view rendering
  // ============================================================

  function renderSuccess(result, formData) {
    // Reference ID
    $('ref-id').textContent = result.chart_session_id || '—';

    // Solar date
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const solarDate = `${monthNames[formData.s_month - 1]} ${formData.s_day}, ${formData.s_year}`;
    $('sum-solar').textContent = solarDate;

    // Lunar date (from API response)
    $('sum-lunar').textContent = result.lunar_date || '—';

    // Birth hour (from API response or from form)
    $('sum-hour').textContent = result.hour_branch
      ? `${result.hour_branch} (${formatHour(formData.hour_num)})`
      : formatHour(formData.hour_num);

    // Records
    const records = result.records_inserted || 0;
    $('sum-records').textContent = `${records.toLocaleString()} entries`;
  }

  function formatHour(hourNum) {
    const ranges = {
      1: '23:00 – 01:00',
      2: '01:00 – 03:00',
      3: '03:00 – 05:00',
      4: '05:00 – 07:00',
      5: '07:00 – 09:00',
      6: '09:00 – 11:00',
      7: '11:00 – 13:00',
      8: '13:00 – 15:00',
      9: '15:00 – 17:00',
      10: '17:00 – 19:00',
      11: '19:00 – 21:00',
      12: '21:00 – 23:00',
      13: 'Late 23:00+',
    };
    return ranges[hourNum] || '—';
  }

  // ============================================================
  // Copy to clipboard
  // ============================================================

  function initCopyButton() {
    const btn = $('copy-ref');
    btn.addEventListener('click', async () => {
      const refId = $('ref-id').textContent;
      if (!refId || refId === '—') return;

      try {
        await navigator.clipboard.writeText(refId);
        btn.classList.add('copied');
        const originalIcon = btn.querySelector('.copy-icon').textContent;
        btn.querySelector('.copy-icon').textContent = '✓';
        setTimeout(() => {
          btn.classList.remove('copied');
          btn.querySelector('.copy-icon').textContent = originalIcon;
        }, 1500);
      } catch (e) {
        console.warn('Clipboard write failed:', e);
      }
    });
  }

  // ============================================================
  // Restart / Retry
  // ============================================================

  function initRestartButton() {
    $('restart-btn').addEventListener('click', () => {
      // Reset form
      $('chart-form').reset();
      $$('.toggle-btn').forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      $('gender').value = '';
      $('report_lang').value = '';
      clearError();
      showView('view-input');
    });
  }

  function initRetryButton() {
    $('retry-btn').addEventListener('click', () => {
      clearError();
      showView('view-input');
    });
  }

  // ============================================================
  // Form submit handler
  // ============================================================

  function initFormSubmit() {
    $('chart-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      clearError();

      // Gather form data
      const data = {
        user_name: $('user_name').value.trim(),
        user_email: $('user_email').value.trim(),
        s_year: $('s_year').value,
        s_month: $('s_month').value,
        s_day: $('s_day').value,
        hour_num: $('hour_num').value,
        gender: $('gender').value,
        report_lang: $('report_lang').value,
        newsletter_consent: $('newsletter_consent').checked,
      };

      // Validate
      const errorMsg = validateForm(data);
      if (errorMsg) {
        showError(errorMsg);
        return;
      }

      // Switch to loading view
      showView('view-loading');
      startLoadingAnimation();

      // Submit
      try {
        const result = await submitChartRequest(data);
        stopLoadingAnimation();

        if (result.status === 'success') {
          renderSuccess(result, data);
          showView('view-success');
        } else if (result.status === 'partial_success') {
          // 部分成功也算成功給使用者看
          renderSuccess(result, data);
          showView('view-success');
        } else {
          throw new Error(result.message || 'Unknown error from server.');
        }
      } catch (err) {
        stopLoadingAnimation();
        $('error-detail').textContent = err.message || 'An unexpected error occurred. Please try again later.';
        showView('view-error');
      }
    });
  }

  // ============================================================
  // Boot
  // ============================================================

  document.addEventListener('DOMContentLoaded', () => {
    initYearOptions();
    initMonthOptions();
    initDayOptions();

    $('s_year').addEventListener('change', updateDayOptions);
    $('s_month').addEventListener('change', updateDayOptions);

    initToggleGroups();
    initCopyButton();
    initRestartButton();
    initRetryButton();
    initFormSubmit();
  });

})();
