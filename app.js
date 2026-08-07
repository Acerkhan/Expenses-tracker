const SUPABASE_URL = 'https://inptsochtqsarxyjdqkv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlucHRzb2NodHFzYXJ4eWpkcWt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1NzE1MzMsImV4cCI6MjEwMTE0NzUzM30.Nhvb2IrCBfqvznvD_j0lMwFbWqsRSdmrkaOfHpVXqR4';

let transactions = [];

// --- Helper: Format Currency (Fixes the negative sign bug) ---
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

  // Automatically populate today's date if navigating to the transactions page
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

  // Setup Date logic for Month/Week tracking
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  // Get start of the current week (Sunday)
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  // Process all transactions
  transactions.forEach(t => {
    const amt = Number(t.amount);
    const tDate = new Date(t.date);

    if (t.type === 'Income') {
      income += amt;
    } else {
      expenses += amt;
      
      // Calculate "This Month" expenses
      if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
        monthExpenses += amt;
      }
      
      // Calculate "This Week" expenses
      if (tDate >= startOfWeek) {
        weekExpenses += amt;
      }

      // Group by Category for Breakdown
      if (!categoryTotals[t.category]) {
        categoryTotals[t.category] = 0;
      }
      categoryTotals[t.category] += amt;
    }
  });

  // 1. Update Dashboard Balances
  const net = income - expenses;
  
  const netEl = document.getElementById('net-balance');
  if (netEl) netEl.innerText = formatCurrency(net);
  
  const incEl = document.getElementById('total-income');
  if (incEl) incEl.innerText = formatCurrency(income);
  
  const expEl = document.getElementById('total-expenses');
  if (expEl) expEl.innerText = formatCurrency(expenses);
  
  const monthEl = document.getElementById('month-total');
  if (monthEl) monthEl.innerText = formatCurrency(monthExpenses);
  
  const weekEl = document.getElementById('week-total');
  if (weekEl) weekEl.innerText = formatCurrency(weekExpenses);

  // 2. Update Category Breakdown
  const catEl = document.getElementById('category-breakdown');
  if (catEl) {
    if (Object.keys(categoryTotals).length === 0) {
      catEl.innerHTML = '<div style="color: #6b7280; font-size: 0.9rem;">No expenses yet.</div>';
    } else {
      // Sort categories from highest spending to lowest
      const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
      
      catEl.innerHTML = sortedCategories.map(([catName, amount]) => `
        <div class="category-item">
          <span>${catName}</span>
          <strong>${formatCurrency(amount)}</strong>
        </div>
      `).join('');
    }
  }

  // 3. Update Transactions List
  const listEl = document.getElementById('transactions-list');
  if (listEl) {
    if (transactions.length === 0) {
      listEl.innerText = 'No transactions recorded yet.';
      return;
    }

    listEl.innerHTML = transactions.map(t => {
      const isIncome = t.type === 'Income';
      const sign = isIncome ? '+' : '-';
      const color = isIncome ? '#10b981' : '#ef4444';
      
      return `
        <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
          <div>
            <strong style="color: #111;">${t.description}</strong><br>
            <small style="color: #6b7280;">${t.category} • ${t.date}</small>
          </div>
          <div style="font-weight: bold; color: ${color}; display: flex; align-items: center;">
            ${sign}$${Number(t.amount).toFixed(2)}
          </div>
        </div>
      `;
    }).join('');
  }
}

function filterTransactions() {
  renderApp(); // Add logic here later if you want dropdown filtering
}

function exportCSV() {
  let csv = 'Type,Category,Description,Amount,Date\n';
  transactions.forEach(t => {
    csv += `${t.type},${t.category},"${t.description}",${t.amount},${t.date}\n`;
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
