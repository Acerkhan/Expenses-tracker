const SUPABASE_URL = 'https://inptsochtqsarxyjdqkv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlucHRzb2NodHFzYXJ4eWpkcWt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1NzE1MzMsImV4cCI6MjEwMTE0NzUzM30.Nhvb2IrCBfqvznvD_j0lMwFbWqsRSdmrkaOfHpVXqR4';

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let transactions = [];

// --- Navigation ---
function switchPage(pageId) {
  document.querySelectorAll('.page-section').forEach(section => {
    section.style.display = 'none';
  });
  document.querySelectorAll('.nav-buttons button').forEach(btn => {
    btn.classList.remove('active');
  });

  document.getElementById(`page-${pageId}`).style.display = 'block';
  document.getElementById(`nav-${pageId}`).classList.add('active');

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
    const response = await fetch(`${SUPABASE_URL}/rest/v1/transactions?select=*`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    if (!response.ok) throw new Error('Failed to connect to database');
    transactions = await response.json();
    renderApp();
  } catch (error) {
    console.error('Error loading data from Supabase:', error);
    const listEl = document.getElementById('transactions-list');
    if (listEl) listEl.innerText = 'Error loading data.';
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

  transactions.forEach(t => {
    if (t.type === 'Income') income += Number(t.amount);
    else expenses += Number(t.amount);
  });

  const net = income - expenses;
  
  const netEl = document.getElementById('net-balance');
  if (netEl) netEl.innerText = `$${net.toFixed(2)}`;
  
  const incEl = document.getElementById('total-income');
  if (incEl) incEl.innerText = `$${income.toFixed(2)}`;
  
  const expEl = document.getElementById('total-expenses');
  if (expEl) expEl.innerText = `$${expenses.toFixed(2)}`;
  
  const monthEl = document.getElementById('month-total');
  if (monthEl) monthEl.innerText = `$${expenses.toFixed(2)}`;
  
  const weekEl = document.getElementById('week-total');
  if (weekEl) weekEl.innerText = `$${(expenses * 0.3).toFixed(2)}`;

  const listEl = document.getElementById('transactions-list');
  if (listEl) {
    if (transactions.length === 0) {
      listEl.innerText = 'No transactions recorded yet.';
      return;
    }

    listEl.innerHTML = transactions.map(t => `
      <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
        <div>
          <strong>${t.description}</strong><br>
          <small style="color: #666;">${t.category} • ${t.date}</small>
        </div>
        <div style="font-weight: bold; color: ${t.type === 'Income' ? '#10b981' : '#ef4444'};">
          ${t.type === 'Income' ? '+' : '-'}$${Number(t.amount).toFixed(2)}
        </div>
      </div>
    `).join('');
  }
}

function filterTransactions() {
  renderApp();
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
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('txn-date');
  if (dateInput) dateInput.value = today;
  fetchTransactions();
});
