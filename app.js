const SUPABASE_URL = 'https://inptsochtqsarxyjdqkv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlucHRzb2NodHFzYXJ4eWpkcWt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1NzE1MzMsImV4cCI6MjEwMTE0NzUzM30.Nhvb2IrCBfqvznvD_j0lMwFbWqsRSdmrkaOfHpVXqR4';
let transactions = [];

// --- Supabase Configuration ---
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

let transactions = [];
let cashflowChartInstance = null;
let categoryChartInstance = null;

// --- Helper: Format Currency ---
function formatCurrency(amount) {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount).toFixed(2);
  return isNegative ? `-$${absAmount}` : `$${absAmount}`;
}

// --- Navigation ---
function switchPage(pageId) {
  document.querySelectorAll('.page-section').forEach(section => {
    section.style.display = 'none';
  });
  document.querySelectorAll('.nav-buttons button').forEach(btn => {
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
    if (!response.ok) throw new Error('Failed to fetch from database');
    transactions = await response.json();
    renderApp();
  } catch (error) {
    console.error('Error loading data from Supabase:', error);
    const listEl = document.getElementById('transactions-list');
    if (listEl) listEl.innerText = 'Error loading data. Check your connection or API keys.';
  }
}

// --- Add Transaction ---
async function addTransaction(event) {
  event.preventDefault();
  const type = document.getElementById('txn-type').value;
  const category = document.getElementById('txn-category').value;
  const description = document.getElementById('txn-desc').value;
  const amount = parseFloat(document.getElementById('txn-amount').value);
  const date = document.getElementById('txn-date').value;

  const newTxn = { type, category, description, amount, date };

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
      fetchTransactions();
      switchPage('dashboard');
    }
  } catch (error) {
    console.error('Error adding transaction:', error);
  }
}

// --- Render UI ---
function renderApp() {
  let income = 0;
  let expenses = 0;
  let monthExpenses = 0;
  let weekExpenses = 0;
  
  const categoryTotals = {};

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  transactions.forEach(t => {
    const amt = Number(t.amount);
    const tDate = new Date(t.date);

    const txnType = (t.type || '').toString().toLowerCase();
    const isIncome = txnType === 'income';

    if (isIncome) {
      income += amt;
    } else {
      expenses += amt;
      
      if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
        monthExpenses += amt;
      }
      
      if (tDate >= startOfWeek) {
        weekExpenses += amt;
      }

      const catName = t.category || 'Uncategorized';
      if (!categoryTotals[catName]) {
        categoryTotals[catName] = 0;
      }
      categoryTotals[catName] += amt;
    }
  });

  // 1. Text UI Updates
  const net = income - expenses;
  if (document.getElementById('net-balance')) document.getElementById('net-balance').innerText = formatCurrency(net);
  if (document.getElementById('total-income')) document.getElementById('total-income').innerText = formatCurrency(income);
  if (document.getElementById('total-expenses')) document.getElementById('total-expenses').innerText = formatCurrency(expenses);
  if (document.getElementById('month-total')) document.getElementById('month-total').innerText = formatCurrency(monthExpenses);
  if (document.getElementById('week-total')) document.getElementById('week-total').innerText = formatCurrency(weekExpenses);

  // 2. Dashboard Category List Update
  const catEl = document.getElementById('category-breakdown');
  if (catEl) {
    if (Object.keys(categoryTotals).length === 0) {
      catEl.innerHTML = '<div style="color: #6b7280; font-size: 0.9rem;">No expenses yet.</div>';
    } else {
      const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
      catEl.innerHTML = sortedCategories.map(([catName, amount]) => `
        <div class="category-item">
          <span>${catName}</span>
          <strong>${formatCurrency(amount)}</strong>
        </div>
      `).join('');
    }
  }

  // 3. Transactions List Update
  const listEl = document.getElementById('transactions-list');
  if (listEl) {
    if (transactions.length === 0) {
      listEl.innerText = 'No transactions recorded yet.';
    } else {
      listEl.innerHTML = transactions.map(t => {
        const txnType = (t.type || '').toString().toLowerCase();
        const isIncome = txnType === 'income';
        const sign = isIncome ? '+' : '-';
        const color = isIncome ? '#10b981' : '#ef4444';
        
        const displayName = t.description || t.name || t.title || t.item || 'No Description';
        const displayCategory = t.category || 'Uncategorized';
        
        return `
          <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
            <div>
              <strong style="color: #111;">${displayName}</strong><br>
              <small style="color: #6b7280;">${displayCategory} • ${t.date}</small>
            </div>
            <div style="font-weight: bold; color: ${color}; display: flex; align-items: center;">
              ${sign}$${Number(t.amount).toFixed(2)}
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // 4. Render Charts for Overview Tab
  renderCharts(income, expenses, categoryTotals);
}

// --- Chart Rendering ---
function renderCharts(income, expenses, categoryTotals) {
  // Destroy old charts to prevent hovering glitches
  if (cashflowChartInstance) cashflowChartInstance.destroy();
  if (categoryChartInstance) categoryChartInstance.destroy();

  // Cashflow Doughnut Chart
  const ctxCashflow = document.getElementById('cashflowChart');
  if (ctxCashflow) {
    cashflowChartInstance = new Chart(ctxCashflow, {
      type: 'doughnut',
      data: {
        labels: ['Income', 'Expenses'],
        datasets: [{
          data: [income, expenses],
          backgroundColor: ['#10b981', '#ef4444'],
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

  // Categories Bar Chart
  const ctxCategory = document.getElementById('categoryChart');
  if (ctxCategory) {
    // Sort categories alphabetically for the chart, or highest to lowest
    const sortedCats = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
    const labels = sortedCats.map(c => c[0]);
    const data = sortedCats.map(c => c[1]);

    categoryChartInstance = new Chart(ctxCategory, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Amount Spent ($)',
          data: data,
          backgroundColor: '#6366f1',
          borderRadius: 4
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

function filterTransactions() {
  renderApp(); 
}

function exportCSV() {
  let csv = 'Type,Category,Description,Amount,Date\n';
  transactions.forEach(t => {
    const displayName = t.description || t.name || t.title || t.item || 'No Description';
    csv += `${t.type || 'Expense'},${t.category || 'Uncategorized'},"${displayName}",${t.amount},${t.date}\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute('download', 'expenses.csv');
  a.click();
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  fetchTransactions();
});
