const translations = {
  app_title: { en: 'Tender & Project Management', ar: 'إدارة المناقصات والمشاريع' },
  app_subtitle: {
    en: 'Bilingual procurement and project lifecycle tracking',
    ar: 'منصة ثنائية اللغة لإدارة المناقصات ودورة حياة المشاريع',
  },
  language: { en: 'Language', ar: 'اللغة' },
  login_title: { en: 'Sign in', ar: 'تسجيل الدخول' },
  username: { en: 'Username', ar: 'اسم المستخدم' },
  password: { en: 'Password', ar: 'كلمة المرور' },
  login: { en: 'Login', ar: 'دخول' },
  login_help: {
    en: 'Use the demo accounts described in the documentation.',
    ar: 'استخدم حسابات العرض المذكورة في الدليل.',
  },
  dashboard: { en: 'Dashboard', ar: 'لوحة التحكم' },
  tenders: { en: 'Tenders', ar: 'المناقصات' },
  projects: { en: 'Projects', ar: 'المشاريع' },
  suppliers: { en: 'Suppliers', ar: 'الموردون' },
  notifications: { en: 'Notifications', ar: 'الإشعارات' },
  reports: { en: 'Reports', ar: 'التقارير' },
  logout: { en: 'Logout', ar: 'خروج' },
  dashboard_title: { en: 'Portfolio overview', ar: 'نظرة عامة على المحفظة' },
  calendar_title: { en: 'Upcoming deadlines', ar: 'المواعيد القادمة' },
  tenders_title: { en: 'Tender pipeline', ar: 'خط المناقصات' },
  export_csv: { en: 'Download CSV', ar: 'تنزيل CSV' },
  new_tender: { en: 'Create / Update Tender', ar: 'إنشاء / تحديث مناقصة' },
  reference_code: { en: 'Reference', ar: 'المرجع' },
  title_en: { en: 'Title (EN)', ar: 'العنوان (إنجليزي)' },
  title_ar: { en: 'Title (AR)', ar: 'العنوان (عربي)' },
  tender_type: { en: 'Type', ar: 'النوع' },
  status: { en: 'Status', ar: 'الحالة' },
  donor: { en: 'Donor', ar: 'الجهة المانحة' },
  estimated_value: { en: 'Estimated value', ar: 'القيمة التقديرية' },
  currency: { en: 'Currency', ar: 'العملة' },
  issue_date: { en: 'Issue date', ar: 'تاريخ الإصدار' },
  submission_deadline: { en: 'Submission deadline', ar: 'تاريخ الإقفال' },
  description_en: { en: 'Description (EN)', ar: 'الوصف (إنجليزي)' },
  description_ar: { en: 'Description (AR)', ar: 'الوصف (عربي)' },
  save: { en: 'Save', ar: 'حفظ' },
  reset: { en: 'Reset', ar: 'إعادة' },
  tender_list: { en: 'Tenders', ar: 'المناقصات' },
  title: { en: 'Title', ar: 'العنوان' },
  actions: { en: 'Actions', ar: 'إجراءات' },
  attachments: { en: 'Attachments', ar: 'المرفقات' },
  upload: { en: 'Upload', ar: 'رفع' },
  projects_title: { en: 'Projects', ar: 'المشاريع' },
  new_project: { en: 'Create / Update Project', ar: 'إنشاء / تحديث مشروع' },
  tender_id: { en: 'Tender ID', ar: 'رقم المناقصة' },
  project_name_en: { en: 'Project name (EN)', ar: 'اسم المشروع (إنجليزي)' },
  project_name_ar: { en: 'Project name (AR)', ar: 'اسم المشروع (عربي)' },
  start_date: { en: 'Start date', ar: 'تاريخ البدء' },
  end_date: { en: 'End date', ar: 'تاريخ الانتهاء' },
  payment_status: { en: 'Payment status', ar: 'حالة الدفع' },
  paid: { en: 'Paid', ar: 'مدفوع' },
  unpaid: { en: 'Unpaid', ar: 'غير مدفوع' },
  delayed: { en: 'Delayed', ar: 'متأخر' },
  contract_value: { en: 'Contract value', ar: 'قيمة العقد' },
  cost: { en: 'Cost', ar: 'التكلفة' },
  exchange_rate: { en: 'Exchange rate', ar: 'سعر الصرف' },
  amount_received: { en: 'Amount received', ar: 'المبالغ المستلمة' },
  amount_invoiced: { en: 'Amount invoiced', ar: 'المبالغ المفوترة' },
  profit_local: { en: 'Profit (LYD)', ar: 'الربح (دينار)' },
  guarantee_value: { en: 'Guarantee value', ar: 'قيمة الضمان' },
  guarantee_start: { en: 'Guarantee start', ar: 'بداية الضمان' },
  guarantee_end: { en: 'Guarantee end', ar: 'نهاية الضمان' },
  guarantee_retained: { en: 'Retained guarantee', ar: 'مبلغ الضمان المحتجز' },
  manager_id: { en: 'Manager user ID', ar: 'رقم مدير المشروع' },
  notes: { en: 'Notes', ar: 'ملاحظات' },
  project_list: { en: 'Projects', ar: 'قائمة المشاريع' },
  project: { en: 'Project', ar: 'المشروع' },
  tender: { en: 'Tender', ar: 'المناقصة' },
  invoices: { en: 'Invoices', ar: 'الفواتير' },
  amount: { en: 'Amount', ar: 'المبلغ' },
  due_date: { en: 'Due date', ar: 'تاريخ الاستحقاق' },
  paid_date: { en: 'Paid date', ar: 'تاريخ السداد' },
  add_invoice: { en: 'Add invoice', ar: 'إضافة فاتورة' },
  suppliers_title: { en: 'Supplier directory', ar: 'دليل الموردين' },
  new_supplier: { en: 'Add supplier', ar: 'إضافة مورد' },
  name_en: { en: 'Name (EN)', ar: 'الاسم (إنجليزي)' },
  name_ar: { en: 'Name (AR)', ar: 'الاسم (عربي)' },
  contact_name: { en: 'Contact', ar: 'الشخص المسؤول' },
  email: { en: 'Email', ar: 'البريد الإلكتروني' },
  phone: { en: 'Phone', ar: 'الهاتف' },
  address: { en: 'Address', ar: 'العنوان' },
  supplier_list: { en: 'Suppliers', ar: 'الموردون' },
  name: { en: 'Name', ar: 'الاسم' },
  contact: { en: 'Contact', ar: 'التواصل' },
  notifications_title: { en: 'Alerts & reminders', ar: 'التنبيهات والتذكيرات' },
  reports_title: { en: 'Reports', ar: 'التقارير' },
  view: { en: 'View', ar: 'عرض' },
  delete: { en: 'Delete', ar: 'حذف' },
  edit: { en: 'Edit', ar: 'تعديل' },
  mark_read: { en: 'Mark read', ar: 'تعيين كمقروء' },
  select_tender_first: { en: 'Select a tender first', ar: 'يرجى اختيار مناقصة أولاً' },
  select_project_first: { en: 'Select a project first', ar: 'يرجى اختيار مشروع أولاً' },
  confirm_delete_tender: { en: 'Delete tender?', ar: 'هل تريد حذف المناقصة؟' },
  confirm_delete_supplier: { en: 'Delete supplier?', ar: 'هل تريد حذف المورد؟' },
};

let currentUser = null;
let currentLanguage = 'en';
let selectedTenderId = null;
let selectedProjectId = null;

const yearEl = document.getElementById('year');
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

const languageSelect = document.getElementById('language-select');
if (languageSelect) {
  languageSelect.addEventListener('change', (event) => {
    setLanguage(event.target.value);
  });
}

function setLanguage(lang) {
  currentLanguage = lang;
  document.body.classList.toggle('arabic', lang === 'ar');
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const translation = translations[key];
    if (translation) {
      el.textContent = translation[lang] || translation.en;
    }
  });
}

setLanguage('en');

function t(key, fallback = '') {
  const entry = translations[key];
  if (!entry) return fallback || key;
  return entry[currentLanguage] || entry.en || fallback || key;
}

async function fetchJSON(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (response.status === 204) {
    return {};
  }
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch (error) {
    console.error('Failed to parse JSON', error, text);
  }
  if (!response.ok) {
    const errorMessage = data.error || response.statusText;
    throw new Error(errorMessage);
  }
  return data;
}

const loginForm = document.getElementById('login-form');
const loginSection = document.getElementById('login-section');
const portalSection = document.getElementById('portal');
const loginError = document.getElementById('login-error');
const userInfo = document.getElementById('user-info');

if (loginForm) {
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    loginError.textContent = '';
    const formData = new FormData(loginForm);
    const payload = {
      username: formData.get('username'),
      password: formData.get('password'),
    };
    try {
      const data = await fetchJSON('/api/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      currentUser = data.user;
      loginSection.classList.add('hidden');
      portalSection.classList.remove('hidden');
      updateUserInfo();
      activateNav('dashboard');
      await refreshAll();
    } catch (error) {
      loginError.textContent = error.message;
    }
  });
}

const logoutButton = document.getElementById('logout');
if (logoutButton) {
  logoutButton.addEventListener('click', async () => {
    await fetchJSON('/api/logout', { method: 'POST' });
    currentUser = null;
    portalSection.classList.add('hidden');
    loginSection.classList.remove('hidden');
    userInfo.textContent = '';
    clearTables();
  });
}

async function getCurrentUser() {
  try {
    const data = await fetchJSON('/api/me');
    currentUser = data.user;
    loginSection.classList.add('hidden');
    portalSection.classList.remove('hidden');
    updateUserInfo();
    await refreshAll();
  } catch (error) {
    console.log('Not authenticated yet');
  }
}

function updateUserInfo() {
  if (!currentUser) {
    userInfo.textContent = '';
    return;
  }
  userInfo.textContent = `${currentUser.full_name || currentUser.username} (${currentUser.role})`;
}

function activateNav(target) {
  document.querySelectorAll('.nav-link').forEach((button) => {
    const panelId = button.getAttribute('data-target');
    if (panelId === target) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  });
  document.querySelectorAll('.panel').forEach((panel) => {
    if (panel.id === target) {
      panel.classList.remove('hidden');
    } else {
      panel.classList.add('hidden');
    }
  });
  switch (target) {
    case 'dashboard':
      loadDashboard();
      break;
    case 'tenders':
      loadTenders();
      break;
    case 'projects':
      loadProjects();
      break;
    case 'suppliers':
      loadSuppliers();
      break;
    case 'notifications':
      loadNotifications();
      break;
    case 'reports':
      loadReports();
      break;
  }
}

document.querySelectorAll('.nav-link').forEach((button) => {
  const target = button.getAttribute('data-target');
  if (target) {
    button.addEventListener('click', () => activateNav(target));
  }
});

async function refreshAll() {
  await Promise.all([
    loadDashboard(),
    loadTenders(),
    loadProjects(),
    loadSuppliers(),
    loadNotifications(),
    loadReports(),
  ]);
}

function clearTables() {
  document.querySelectorAll('tbody').forEach((tbody) => {
    tbody.innerHTML = '';
  });
  document.getElementById('dashboard-metrics').innerHTML = '';
  document.getElementById('report-content').innerHTML = '';
  document.getElementById('calendar-list').innerHTML = '';
  document.getElementById('notification-list').innerHTML = '';
}

async function loadDashboard() {
  try {
    const data = await fetchJSON('/api/reports/summary');
    renderDashboard(data);
  } catch (error) {
    console.error(error);
  }
}

function renderDashboard(data) {
  const dashboardMetrics = document.getElementById('dashboard-metrics');
  dashboardMetrics.innerHTML = '';
  const metrics = [
    { label: t('tenders'), value: data.tenders.total_estimated?.toFixed(2) || '0' },
    { label: t('projects'), value: data.projects.total_profit?.toFixed(2) || '0' },
    { label: t('notifications'), value: data.calendar.length },
    { label: t('amount_invoiced'), value: data.finance.amount_invoiced?.toFixed(2) || '0' },
  ];
  metrics.forEach((metric) => {
    const card = document.createElement('div');
    card.className = 'metric';
    card.innerHTML = `<h4>${metric.label}</h4><span>${metric.value}</span>`;
    dashboardMetrics.appendChild(card);
  });
  const calendarList = document.getElementById('calendar-list');
  calendarList.innerHTML = '';
  data.calendar.forEach((item) => {
    const li = document.createElement('li');
    const title = currentLanguage === 'ar' ? item.title_ar || item.title_en : item.title_en;
    li.textContent = `${item.date} • ${title}`;
    calendarList.appendChild(li);
  });
}

async function loadTenders() {
  try {
    const data = await fetchJSON('/api/tenders');
    populateTenderOptions(data);
    renderTenderTable(data.tenders);
  } catch (error) {
    console.error(error);
  }
}

function populateTenderOptions(data) {
  const statusSelect = document.getElementById('tender-status');
  const typeSelect = document.getElementById('tender-type');
  if (statusSelect) {
    statusSelect.innerHTML = '';
    data.statuses.forEach((status) => {
      const option = document.createElement('option');
      option.value = status;
      option.textContent = status;
      statusSelect.appendChild(option);
    });
  }
  if (typeSelect) {
    typeSelect.innerHTML = '';
    data.types.forEach((type) => {
      const option = document.createElement('option');
      option.value = type;
      option.textContent = type;
      typeSelect.appendChild(option);
    });
  }
}

function renderTenderTable(tenders) {
  const tbody = document.querySelector('#tender-table tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  tenders.forEach((tender) => {
    const tr = document.createElement('tr');
    const title = currentLanguage === 'ar' ? tender.title_ar || tender.title_en : tender.title_en;
    tr.innerHTML = `
      <td>${tender.reference_code || '-'}</td>
      <td>${title}</td>
      <td>${tender.tender_type}</td>
      <td>${tender.status}</td>
      <td>${tender.submission_deadline || '-'}</td>
      <td>
        <button class="secondary" data-action="view" data-id="${tender.id}">${t('view')}</button>
        <button class="secondary" data-action="delete" data-id="${tender.id}">${t('delete')}</button>
      </td>`;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('button').forEach((button) => {
    const id = button.getAttribute('data-id');
    const action = button.getAttribute('data-action');
    button.addEventListener('click', () => {
      if (action === 'view') {
        loadTenderDetail(id);
      } else if (action === 'delete') {
        deleteTender(id);
      }
    });
  });
}

async function loadTenderDetail(id) {
  try {
    const data = await fetchJSON(`/api/tenders/${id}`);
    selectedTenderId = data.tender.id;
    document.getElementById('tender-id').value = data.tender.id;
    document.getElementById('tender-reference').value = data.tender.reference_code || '';
    document.getElementById('tender-title-en').value = data.tender.title_en || '';
    document.getElementById('tender-title-ar').value = data.tender.title_ar || '';
    document.getElementById('tender-type').value = data.tender.tender_type || '';
    document.getElementById('tender-status').value = data.tender.status || '';
    document.getElementById('tender-donor').value = data.tender.donor || '';
    document.getElementById('tender-value').value = data.tender.estimated_value || '';
    document.getElementById('tender-currency').value = data.tender.currency || '';
    document.getElementById('tender-issue').value = data.tender.issue_date || '';
    document.getElementById('tender-deadline').value = data.tender.submission_deadline || '';
    document.getElementById('tender-description-en').value = data.tender.description_en || '';
    document.getElementById('tender-description-ar').value = data.tender.description_ar || '';
    renderAttachments(data.attachments);
  } catch (error) {
    console.error(error);
  }
}

function renderAttachments(attachments) {
  const list = document.getElementById('attachment-list');
  list.innerHTML = '';
  attachments.forEach((attachment) => {
    const li = document.createElement('li');
    const link = document.createElement('a');
    link.href = `/files/${attachment.stored_name}`;
    link.textContent = attachment.filename;
    link.setAttribute('target', '_blank');
    li.appendChild(link);
    list.appendChild(li);
  });
}

async function deleteTender(id) {
  if (!confirm(t('confirm_delete_tender'))) return;
  try {
    await fetchJSON(`/api/tenders/${id}`, { method: 'DELETE' });
    await loadTenders();
  } catch (error) {
    alert(error.message);
  }
}

const tenderForm = document.getElementById('tender-form');
if (tenderForm) {
  tenderForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = {
      reference_code: document.getElementById('tender-reference').value,
      title_en: document.getElementById('tender-title-en').value,
      title_ar: document.getElementById('tender-title-ar').value,
      tender_type: document.getElementById('tender-type').value,
      status: document.getElementById('tender-status').value,
      donor: document.getElementById('tender-donor').value,
      estimated_value: parseFloat(document.getElementById('tender-value').value) || null,
      currency: document.getElementById('tender-currency').value,
      issue_date: document.getElementById('tender-issue').value || null,
      submission_deadline: document.getElementById('tender-deadline').value || null,
      description_en: document.getElementById('tender-description-en').value,
      description_ar: document.getElementById('tender-description-ar').value,
    };
    const tenderId = document.getElementById('tender-id').value;
    try {
      if (tenderId) {
        await fetchJSON(`/api/tenders/${tenderId}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await fetchJSON('/api/tenders', { method: 'POST', body: JSON.stringify(payload) });
      }
      tenderForm.reset();
      selectedTenderId = null;
      await loadTenders();
    } catch (error) {
      alert(error.message);
    }
  });
}

const tenderReset = document.getElementById('tender-reset');
if (tenderReset) {
  tenderReset.addEventListener('click', () => {
    tenderForm.reset();
    document.getElementById('tender-id').value = '';
    selectedTenderId = null;
    document.getElementById('attachment-list').innerHTML = '';
  });
}

const attachmentForm = document.getElementById('attachment-form');
if (attachmentForm) {
  attachmentForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!selectedTenderId) {
      alert(t('select_tender_first'));
      return;
    }
    const fileInput = document.getElementById('attachment-input');
    if (!fileInput.files.length) return;
    const file = fileInput.files[0];
    const base64 = await toBase64(file);
    try {
      await fetchJSON(`/api/tenders/${selectedTenderId}/attachments`, {
        method: 'POST',
        body: JSON.stringify({ filename: file.name, content: base64 }),
      });
      fileInput.value = '';
      await loadTenderDetail(selectedTenderId);
    } catch (error) {
      alert(error.message);
    }
  });
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

const exportTendersButton = document.getElementById('export-tenders');
if (exportTendersButton) {
  exportTendersButton.addEventListener('click', () => {
    window.location.href = '/api/tenders/export';
  });
}

async function loadProjects() {
  try {
    const data = await fetchJSON('/api/projects');
    populateProjectOptions(data);
    renderProjectTable(data.projects);
  } catch (error) {
    console.error(error);
  }
}

function populateProjectOptions(data) {
  const statusSelect = document.getElementById('project-status');
  if (statusSelect) {
    statusSelect.innerHTML = '';
    data.statuses.forEach((status) => {
      const option = document.createElement('option');
      option.value = status;
      option.textContent = status;
      statusSelect.appendChild(option);
    });
  }
}

function renderProjectTable(projects) {
  const tbody = document.querySelector('#project-table tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  projects.forEach((project) => {
    const tr = document.createElement('tr');
    const title = currentLanguage === 'ar' ? project.name_ar || project.name_en : project.name_en;
    const tenderTitle = currentLanguage === 'ar' ? project.tender_title_ar || project.tender_title_en : project.tender_title_en;
    tr.innerHTML = `
      <td>${project.id}</td>
      <td>${title}</td>
      <td>${tenderTitle}</td>
      <td>${project.status}</td>
      <td>${project.payment_status}</td>
      <td>
        <button class="secondary" data-action="view" data-id="${project.id}">${t('view')}</button>
      </td>`;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('button[data-action="view"]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.getAttribute('data-id');
      loadProjectDetail(id);
    });
  });
}

async function loadProjectDetail(id) {
  try {
    const data = await fetchJSON(`/api/projects/${id}`);
    selectedProjectId = data.project.id;
    document.getElementById('project-id').value = data.project.id;
    document.getElementById('project-tender-id').value = data.project.tender_id;
    document.getElementById('project-name-en').value = data.project.name_en || '';
    document.getElementById('project-name-ar').value = data.project.name_ar || '';
    document.getElementById('project-start').value = data.project.start_date || '';
    document.getElementById('project-end').value = data.project.end_date || '';
    document.getElementById('project-status').value = data.project.status || '';
    document.getElementById('project-payment-status').value = data.project.payment_status || 'unpaid';
    document.getElementById('project-currency').value = data.project.currency || '';
    document.getElementById('project-value').value = data.project.contract_value || '';
    document.getElementById('project-cost').value = data.project.cost || '';
    document.getElementById('project-rate').value = data.project.exchange_rate || '';
    document.getElementById('project-received').value = data.project.amount_received || '';
    document.getElementById('project-invoiced').value = data.project.amount_invoiced || '';
    document.getElementById('project-profit').value = data.project.profit_local || '';
    document.getElementById('project-guarantee-value').value = data.project.guarantee_value || '';
    document.getElementById('project-guarantee-start').value = data.project.guarantee_start || '';
    document.getElementById('project-guarantee-end').value = data.project.guarantee_end || '';
    document.getElementById('project-guarantee-retained').value = data.project.guarantee_retained || '';
    document.getElementById('project-manager-id').value = data.project.manager_id || '';
    document.getElementById('project-notes').value = data.project.notes || '';
    renderInvoices(data.invoices);
  } catch (error) {
    console.error(error);
  }
}

function renderInvoices(invoices) {
  const list = document.getElementById('invoice-list');
  list.innerHTML = '';
  invoices.forEach((invoice) => {
    const li = document.createElement('li');
    li.textContent = `${invoice.amount} ${invoice.currency || ''} • ${invoice.status} • ${t('due_date')} ${invoice.due_date || '-'}`;
    list.appendChild(li);
  });
}

const projectForm = document.getElementById('project-form');
if (projectForm) {
  projectForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = {
      tender_id: parseInt(document.getElementById('project-tender-id').value, 10),
      name_en: document.getElementById('project-name-en').value,
      name_ar: document.getElementById('project-name-ar').value,
      start_date: document.getElementById('project-start').value || null,
      end_date: document.getElementById('project-end').value || null,
      status: document.getElementById('project-status').value,
      payment_status: document.getElementById('project-payment-status').value,
      currency: document.getElementById('project-currency').value,
      contract_value: parseFloat(document.getElementById('project-value').value) || null,
      cost: parseFloat(document.getElementById('project-cost').value) || null,
      exchange_rate: parseFloat(document.getElementById('project-rate').value) || null,
      amount_received: parseFloat(document.getElementById('project-received').value) || null,
      amount_invoiced: parseFloat(document.getElementById('project-invoiced').value) || null,
      profit_local: parseFloat(document.getElementById('project-profit').value) || null,
      guarantee_value: parseFloat(document.getElementById('project-guarantee-value').value) || null,
      guarantee_start: document.getElementById('project-guarantee-start').value || null,
      guarantee_end: document.getElementById('project-guarantee-end').value || null,
      guarantee_retained: parseFloat(document.getElementById('project-guarantee-retained').value) || null,
      manager_id: parseInt(document.getElementById('project-manager-id').value, 10) || null,
      notes: document.getElementById('project-notes').value,
    };
    const projectId = document.getElementById('project-id').value;
    try {
      if (projectId) {
        await fetchJSON(`/api/projects/${projectId}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await fetchJSON('/api/projects', { method: 'POST', body: JSON.stringify(payload) });
      }
      projectForm.reset();
      selectedProjectId = null;
      await loadProjects();
    } catch (error) {
      alert(error.message);
    }
  });
}

const projectReset = document.getElementById('project-reset');
if (projectReset) {
  projectReset.addEventListener('click', () => {
    projectForm.reset();
    document.getElementById('project-id').value = '';
    selectedProjectId = null;
    document.getElementById('invoice-list').innerHTML = '';
  });
}

const invoiceForm = document.getElementById('invoice-form');
if (invoiceForm) {
  invoiceForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!selectedProjectId) {
      alert(t('select_project_first'));
      return;
    }
    const payload = {
      amount: parseFloat(document.getElementById('invoice-amount').value) || null,
      currency: document.getElementById('invoice-currency').value,
      due_date: document.getElementById('invoice-due').value || null,
      paid_date: document.getElementById('invoice-paid').value || null,
      status: document.getElementById('invoice-status').value,
      notes: document.getElementById('invoice-notes').value,
    };
    try {
      await fetchJSON(`/api/projects/${selectedProjectId}/invoices`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      invoiceForm.reset();
      await loadProjectDetail(selectedProjectId);
    } catch (error) {
      alert(error.message);
    }
  });
}

async function loadSuppliers() {
  try {
    const data = await fetchJSON('/api/suppliers');
    renderSuppliers(data.suppliers);
  } catch (error) {
    console.error(error);
  }
}

function renderSuppliers(suppliers) {
  const tbody = document.querySelector('#supplier-table tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  suppliers.forEach((supplier) => {
    const tr = document.createElement('tr');
    const name = currentLanguage === 'ar' ? supplier.name_ar || supplier.name_en : supplier.name_en;
    tr.innerHTML = `
      <td>${supplier.id}</td>
      <td>${name}</td>
      <td>${supplier.contact_name || '-'}</td>
      <td>${supplier.phone || '-'}</td>
      <td>
        <button class="secondary" data-action="edit" data-id="${supplier.id}">${t('edit')}</button>
        <button class="secondary" data-action="delete" data-id="${supplier.id}">${t('delete')}</button>
      </td>`;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('button').forEach((button) => {
    const id = button.getAttribute('data-id');
    const action = button.getAttribute('data-action');
    button.addEventListener('click', () => {
      if (action === 'edit') {
        const supplier = suppliers.find((item) => String(item.id) === id);
        fillSupplierForm(supplier);
      } else if (action === 'delete') {
        deleteSupplier(id);
      }
    });
  });
}

function fillSupplierForm(supplier) {
  document.getElementById('supplier-id').value = supplier.id;
  document.getElementById('supplier-name-en').value = supplier.name_en || '';
  document.getElementById('supplier-name-ar').value = supplier.name_ar || '';
  document.getElementById('supplier-contact').value = supplier.contact_name || '';
  document.getElementById('supplier-email').value = supplier.email || '';
  document.getElementById('supplier-phone').value = supplier.phone || '';
  document.getElementById('supplier-address').value = supplier.address || '';
  document.getElementById('supplier-notes').value = supplier.notes || '';
}

async function deleteSupplier(id) {
  if (!confirm(t('confirm_delete_supplier'))) return;
  try {
    await fetchJSON(`/api/suppliers/${id}`, { method: 'DELETE' });
    await loadSuppliers();
  } catch (error) {
    alert(error.message);
  }
}

const supplierForm = document.getElementById('supplier-form');
if (supplierForm) {
  supplierForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = {
      name_en: document.getElementById('supplier-name-en').value,
      name_ar: document.getElementById('supplier-name-ar').value,
      contact_name: document.getElementById('supplier-contact').value,
      email: document.getElementById('supplier-email').value,
      phone: document.getElementById('supplier-phone').value,
      address: document.getElementById('supplier-address').value,
      notes: document.getElementById('supplier-notes').value,
    };
    const supplierId = document.getElementById('supplier-id').value;
    try {
      if (supplierId) {
        await fetchJSON(`/api/suppliers/${supplierId}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await fetchJSON('/api/suppliers', { method: 'POST', body: JSON.stringify(payload) });
      }
      supplierForm.reset();
      await loadSuppliers();
    } catch (error) {
      alert(error.message);
    }
  });
}

const supplierReset = document.getElementById('supplier-reset');
if (supplierReset) {
  supplierReset.addEventListener('click', () => {
    supplierForm.reset();
    document.getElementById('supplier-id').value = '';
  });
}

async function loadNotifications() {
  try {
    const data = await fetchJSON('/api/notifications');
    renderNotifications(data.notifications);
  } catch (error) {
    console.error(error);
  }
}

function renderNotifications(notifications) {
  const list = document.getElementById('notification-list');
  list.innerHTML = '';
  notifications.forEach((notification) => {
    const li = document.createElement('li');
    const title = currentLanguage === 'ar' ? notification.title_ar : notification.title_en;
    const message = currentLanguage === 'ar' ? notification.message_ar : notification.message_en;
    const badge = document.createElement('span');
    badge.className = `badge ${notification.level}`;
    badge.textContent = notification.level;
    const content = document.createElement('div');
    content.innerHTML = `<strong>${title}</strong><br />${message}`;
    li.appendChild(content);
    li.appendChild(badge);
    if (!notification.is_read) {
      const markButton = document.createElement('button');
      markButton.className = 'secondary';
      markButton.textContent = t('mark_read');
      markButton.addEventListener('click', async () => {
        await fetchJSON(`/api/notifications/${notification.id}/read`, { method: 'POST' });
        await loadNotifications();
      });
      li.appendChild(markButton);
    }
    list.appendChild(li);
  });
}

async function loadReports() {
  try {
    const data = await fetchJSON('/api/reports/summary');
    renderReports(data);
  } catch (error) {
    console.error(error);
  }
}

function renderReports(data) {
  const container = document.getElementById('report-content');
  container.innerHTML = '';
  const sections = [
    { title: t('tenders'), entries: data.tenders },
    { title: t('projects'), entries: data.projects },
    { title: t('amount_invoiced'), entries: data.finance },
  ];
  sections.forEach((section) => {
    const card = document.createElement('div');
    card.className = 'metric';
    const values = Object.entries(section.entries)
      .map(([key, value]) => `<div><strong>${key}</strong>: ${value ?? 0}</div>`)
      .join('');
    card.innerHTML = `<h4>${section.title}</h4>${values}`;
    container.appendChild(card);
  });
}

// Initialize application
getCurrentUser();
