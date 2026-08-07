const SUPABASE_URL = 'https://inptsochtqsarxyjdqkv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlucHRzb2NodHFzYXJ4eWpkcWt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1NzE1MzMsImV4cCI6MjEwMTE0NzUzM30.Nhvb2IrCBfqvznvD_j0lMwFbWqsRSdmrkaOfHpVXqR4';

// --- Supabase Configuration ---
let transactions = [];
let dashChartInstance = null;
let overviewChartInstance = null;

// --- Helper: Format Currency ---
function formatCurrency(amount) {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount).toFixed(2);
  return isNegative ? `-$${absAmount}` : `$${absAmount}`;
}

// --- Navigation Tabs ---
function switchPage(pageId) {
  document.querySelectorAll('.page-section').forEach(section => {
    section.style.display = 'none';
  });
  document.querySelectorAll('.bottom-nav .nav-item').forEach(btn => {
    btn.classList.remove('active');
  });

  const page = document.getElementById(`page-${pageId}`);
  const navBtn = document.getElementById(`nav-${pageId}`);
  
  if (page) page.style.display = 'block';
  if (navBtn) navBtn.classList.add('active');

  if (pageId === 'transactions') {
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('txn-date');
    if (dateInput && !dateInput.value) {
      dateInput.value = today;
    }
  }
}

// --- Data Fetching ---
async function fetchTransactions() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/transactions?select=*&order=date.desc`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    if (!response.ok) throw new Error('Failed to fetch records');
    transactions = await response.json();
    renderApp();
  } catch (error) {
    console.error('Error fetching database:', error);
    const listEl = document.getElementById('transactions-list');
    if (listEl) listEl.innerText = 'Failed to load records.';
  }
}

// --- Add Transaction with On-Screen Error Alert ---
async function addTransaction(event) {
  event.preventDefault();
  const type = document.getElementById('txn-type').value;
  const category = document.getElementById('txn-category').value;
  const title = document.getElementById('txn-desc').value;
  const amount = parseFloat(document.getElementById('txn-amount').value);
  const date = document.getElementById('txn-date').value;

  const newTxn = {
    id: Date.now(), // Generates a unique integer ID that matches your int8 column
    type,
    category,
    title,
    amount,
    date,
    created_at: new Date().toISOString()
  };

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/transactions`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(newTxn)
    });

    if (response.ok) {
      document.getElementById('transaction-form').reset();
      const today = new Date().toISOString().split('T')[0];
      document.getElementById('txn-date').value = today;
      fetchTransactions();
      switchPage('dashboard');
    } else {
      const errText = await response.text();
      alert('Supabase Error: ' + errText);
    }
  } catch (error) {
    alert('Network/JS Error: ' + error.message);
  
  }
}

// --- Delete Transaction ---
async function deleteTransaction(id) {
  if (!confirm('Are you sure you want to delete this transaction?')) return;

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/transactions?id=eq.${id}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    if (response.ok) {
      fetchTransactions();
    } else {
      const errText = await response.text();
      alert('Delete Error: ' + errText);
    }
  } catch (error) {
    alert('Network Error: ' + error.message);
  }
}

// --- Core UI & Logic Renderer ---
function renderApp() {
  let income = 0;
  let expenses = 0;
  let monthExpenses = 0;
  let weekExpenses = 0;
  let todayExpenses = 0;

  const typeTotals = { Expense: 0, Income: 0 };
  const categoryTotals = {};

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const todayString = now.toISOString().split('T')[0];

  transactions.forEach(t => {
    const amt = Number(t.amount);
    const tDate = new Date(t.date);
    const txnType = (t.type || 'Expense').toString().trim();

    if (txnType.toLowerCase() === 'income') {
      income += amt;
      typeTotals['Income'] = (typeTotals['Income'] || 0) + amt;
    } else {
      expenses += amt;
      typeTotals['Expense'] = (typeTotals['Expense'] || 0) + amt;

      if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
        monthExpenses += amt;
      }

      if (tDate >= startOfWeek) {
        weekExpenses += amt;
      }

      if (t.date === todayString) {
        todayExpenses += amt;
      }

      const catName = t.category || 'Uncategorized';
      categoryTotals[catName] = (categoryTotals[catName] || 0) + amt;
    }
  });

  const net = income - expenses;
  if (document.getElementById('net-balance')) document.getElementById('net-balance').innerText = formatCurrency(net);
  if (document.getElementById('total-income')) document.getElementById('total-income').innerText = formatCurrency(income);
  if (document.getElementById('total-expenses')) document.getElementById('total-expenses').innerText = formatCurrency(expenses);
  
  if (document.getElementById('dash-month-total')) document.getElementById('dash-month-total').innerText = formatCurrency(monthExpenses);
  if (document.getElementById('dash-week-total')) document.getElementById('dash-week-total').innerText = formatCurrency(weekExpenses);
  if (document.getElementById('dash-today-total')) document.getElementById('dash-today-total').innerText = formatCurrency(todayExpenses);

  if (document.getElementById('ov-month-total')) document.getElementById('ov-month-total').innerText = formatCurrency(monthExpenses);
  if (document.getElementById('ov-week-total')) document.getElementById('ov-week-total').innerText = formatCurrency(weekExpenses);
  
  const dailyAvg = monthExpenses / (now.getDate() || 1);
  if (document.getElementById('ov-daily-avg')) document.getElementById('ov-daily-avg').innerText = formatCurrency(dailyAvg);

  renderTransactionList();
  renderCharts(typeTotals, categoryTotals);
}

// --- Render Transaction List ---
function renderTransactionList() {
  const listEl = document.getElementById('transactions-list');
  const filterVal = document.getElementById('export-filter').value;
  if (!listEl) return;

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const todayString = now.toISOString().split('T')[0];

  const filtered = transactions.filter(t => {
    const tDate = new Date(t.date);
    if (filterVal === 'monthly') {
      return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
    }
    if (filterVal === 'weekly') {
      return tDate >= startOfWeek;
    }
    if (filterVal === 'daily') {
      return t.date === todayString;
    }
    return true;
  });

  if (filtered.length === 0) {
    listEl.innerHTML = '<div style="color: #64748b; font-size: 0.9rem; text-align:center; padding: 20px;">No transactions found.</div>';
    return;
  }

  listEl.innerHTML = filtered.map(t => {
    const isIncome = (t.type || '').toLowerCase() === 'income';
    const sign = isIncome ? '+' : '-';
    const color = isIncome ? '#10b981' : '#ef4444';
    const itemTitle = t.title || t.description || t.name || 'Untitled';
    const cat = t.category || 'General';
    const recordId = t.id;

    return `
      <div class="txn-item">
        <div class="txn-info">
          <strong>${itemTitle}</strong>
          <small>${cat} • ${t.date}</small>
        </div>
        <div class="txn-right">
          <span class="txn-amount" style="color: ${color};">${sign}$${Number(t.amount).toFixed(2)}</span>
          <button class="btn-delete" onclick="deleteTransaction('${recordId}')" title="Delete">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
}

// --- Chart Rendering Engine ---
function renderCharts(typeTotals, categoryTotals) {
  if (dashChartInstance) dashChartInstance.destroy();
  if (overviewChartInstance) overviewChartInstance.destroy();

  const ctxDash = document.getElementById('dashboardTypeChart');
  if (ctxDash) {
    dashChartInstance = new Chart(ctxDash, {
      type: 'doughnut',
      data: {
        labels: ['Income', 'Expenses'],
        datasets: [{
          data: [typeTotals['Income'], typeTotals['Expense']],
          backgroundColor: ['#10b981', '#4f46e5'],
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }

  const ctxOverview = document.getElementById('overviewCategoryChart');
  if (ctxOverview) {
    const sortedCats = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
    const labels = sortedCats.map(c => c[0]);
    const data = sortedCats.map(c => c[1]);

    overviewChartInstance = new Chart(ctxOverview, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Spent ($)',
          data: data,
          backgroundColor: '#6366f1',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }
}

// --- CSV Export ---
function exportFilteredCSV() {
  const filterVal = document.getElementById('export-filter').value;
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const todayString = now.toISOString().split('T')[0];

  const filtered = transactions.filter(t => {
    const tDate = new Date(t.date);
    if (filterVal === 'monthly') return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
    if (filterVal === 'weekly') return tDate >= startOfWeek;
    if (filterVal === 'daily') return t.date === todayString;
    return true;
  });

  if (filtered.length === 0) {
    alert('No data to export for this filter range.');
    return;
  }

  let csv = 'Type,Category,Title,Amount,Date,Created At\n';
  filtered.forEach(t => {
    const itemTitle = (t.title || t.description || 'Untitled').replace(/"/g, '""');
    csv += `${t.type || 'Expense'},${t.category || 'General'},"${itemTitle}",${t.amount},${t.date},${t.created_at || ''}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute('download', `expenses_${filterVal}.csv`);
  a.click();
}

document.addEventListener('DOMContentLoaded', () => {
  const filterDropdown = document.getElementById('export-filter');
  if (filterDropdown) {
    filterDropdown.addEventListener('change', renderTransactionList);
  }
  fetchTransactions();
});
