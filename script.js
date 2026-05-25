// ============================================================
// FuSang Vision Portal — Form Logic
// Submits to Supabase Edge Function submit_birth_data
// On success → redirect to submitted.html
// ============================================================

// ---- Configuration ----
const SUPABASE_URL = 'https://vrquktgjawayuioglqfn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZycXVrdGdqYXdheXVpb2dscWZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NzAzNjIsImV4cCI6MjA5NTA0NjM2Mn0.6qd9mW2jWYgplfBzr3uTrxVVTilFplJ__ZYM5R7Rrw4';
const EF_SUBMIT_URL = `${SUPABASE_URL}/functions/v1/submit_birth_data`;

// ---- Hardcoded defaults (hidden from user, Beta-stage simplification) ----
const DEFAULTS = {
  birth_minute: 0,
  birth_country: 'Taiwan',
  birth_city: 'Taipei',
  birth_timezone: 'Asia/Taipei',
};

// ============================================================
// DOM Ready
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  initYearOptions();
  initMonthOptions();
  initDayOptions();
  bindToggleGroups();
  bindForm();
});

// ============================================================
// Year / Month / Day dropdowns
// ============================================================
function initYearOptions() {
  const yearSelect = document.getElementById('birth_year');
  const currentYear = new Date().getFullYear();
  // 1920 → currentYear (descending, most users will scroll down)
  for (let y = currentYear; y >= 1920; y--) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    yearSelect.appendChild(opt);
  }
}

function initMonthOptions() {
  const monthSelect = document.getElementById('birth_month');
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  for (let m = 1; m <= 12; m++) {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = `${m} — ${monthNames[m - 1]}`;
    monthSelect.appendChild(opt);
  }
}

function initDayOptions() {
  const daySelect = document.getElementById('birth_day');
  for (let d = 1; d <= 31; d++) {
    const opt = document.createElement('option');
    opt.value = d;
    opt.textContent = d;
    daySelect.appendChild(opt);
  }
}

// ============================================================
// Toggle group (Gender)
// ============================================================
function bindToggleGroups() {
  document.querySelectorAll('.toggle-group').forEach((group) => {
    group.addEventListener('click', (e) => {
      const btn = e.target.closest('.toggle-btn');
      if (!btn) return;

      const name = btn.dataset.name;
      const value = btn.dataset.value;

      // Update visual state
      group.querySelectorAll('.toggle-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      // Update hidden input
      const hiddenInput = document.getElementById(name);
      if (hiddenInput) hiddenInput.value = value;
    });
  });
}

// ============================================================
// Form submission
// ============================================================
function bindForm() {
  const form = document.getElementById('chart-form');
  const submitBtn = document.getElementById('submit-btn');
  const errorBox = document.getElementById('error-message');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.textContent = '';

    // ---- Collect form data ----
    const payload = {
      email: document.getElementById('email').value.trim(),
      display_name: document.getElementById('display_name').value.trim(),
      birth_year: parseInt(document.getElementById('birth_year').value, 10),
      birth_month: parseInt(document.getElementById('birth_month').value, 10),
      birth_day: parseInt(document.getElementById('birth_day').value, 10),
      birth_hour: parseInt(document.getElementById('birth_hour').value, 10),
      birth_minute: DEFAULTS.birth_minute,
      birth_country: DEFAULTS.birth_country,
      birth_city: DEFAULTS.birth_city,
      birth_timezone: DEFAULTS.birth_timezone,
      gender: document.getElementById('gender').value,
    };

    // ---- Client-side validation ----
    const error = validatePayload(payload);
    if (error) {
      showError(error);
      return;
    }

    // ---- Consent check ----
    if (!document.getElementById('newsletter_consent').checked) {
      showError('Please confirm you agree to receive emails.');
      return;
    }

    // ---- Submit ----
    setSubmitting(submitBtn, true);

    try {
      const res = await fetch(EF_SUBMIT_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      // ---- Success → redirect to submitted page ----
      const params = new URLSearchParams({
        job_id: data.job_id,
        email: payload.email,
      });
      window.location.href = `submitted.html?${params.toString()}`;

    } catch (err) {
      console.error('Submit error:', err);
      showError(err.message || 'Something went wrong. Please try again.');
      setSubmitting(submitBtn, false);
    }
  });
}

// ============================================================
// Validation
// ============================================================
function validatePayload(p) {
  if (!p.display_name) return 'Please enter your name.';
  if (!p.email) return 'Please enter your email.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) return 'Please enter a valid email.';
  if (!p.birth_year) return 'Please select your birth year.';
  if (!p.birth_month) return 'Please select your birth month.';
  if (!p.birth_day) return 'Please select your birth day.';
  if (isNaN(p.birth_hour)) return 'Please select your birth hour.';
  if (!p.gender) return 'Please select your gender.';

  // Date sanity check
  const date = new Date(p.birth_year, p.birth_month - 1, p.birth_day);
  if (
    date.getFullYear() !== p.birth_year ||
    date.getMonth() !== p.birth_month - 1 ||
    date.getDate() !== p.birth_day
  ) {
    return 'Please enter a valid date.';
  }

  return null;
}

// ============================================================
// UI helpers
// ============================================================
function setSubmitting(btn, isSubmitting) {
  if (isSubmitting) {
    btn.disabled = true;
    btn.querySelector('.btn-text').textContent = 'Submitting...';
    btn.querySelector('.btn-arrow').textContent = '...';
  } else {
    btn.disabled = false;
    btn.querySelector('.btn-text').textContent = 'Generate My Chart';
    btn.querySelector('.btn-arrow').textContent = '→';
  }
}

function showError(msg) {
  const errorBox = document.getElementById('error-message');
  errorBox.textContent = msg;
  errorBox.style.display = 'block';
}