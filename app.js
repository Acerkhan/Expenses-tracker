const SUPABASE_URL = 'https://inptsochtqsarxyjdqkv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlucHRzb2NodHFzYXJ4eWpkcWt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1NzE1MzMsImV4cCI6MjEwMTE0NzUzM30.Nhvb2IrCBfqvznvD_j0lMwFbWqsRSdmrkaOfHpVXqR4';
let transactions = [];

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

    // FIX: Safely check the type regardless of capitalization
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

  const listEl = document.getElementById('transactions-list');
  if (listEl) {
    if (transactions.length === 0) {
      listEl.innerText = 'No transactions recorded yet.';
      return;
    }

    listEl.innerHTML = transactions.map(t => {
      // FIX: Robust check for Income vs Expense
      const txnType = (t.type || '').toString().toLowerCase();
      const isIncome = txnType === 'income';
      const sign = isIncome ? '+' : '-';
      const color = isIncome ? '#10b981' : '#ef4444';
      
      // FIX: Fallbacks for the description column just in case your Supabase uses a different name
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

function filterTransactions() {
  renderApp(); 
}

function exportCSV() {
  let csv = 'Type,Category,Description,Amount,Date\n';
  transactions.forEach(t => {
    // Ensuring exports capture the right fallback strings as well
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
