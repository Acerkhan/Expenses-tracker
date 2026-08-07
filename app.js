const SUPABASE_URL = 'https://inptsochtqsarxyjdqkv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlucHRzb2NodHFzYXJ4eWpkcWt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1NzE1MzMsImV4cCI6MjEwMTE0NzUzM30.Nhvb2IrCBfqvznvD_j0lMwFbWqsRSdmrkaOfHpVXqR4';

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let globalTransactions = [];
let categoryChartInstance = null;

document.getElementById('date').valueAsDate = new Date();
document.getElementById('transactionForm').addEventListener('submit', addTransaction);

// Page switching function
function switchPage(pageId) {
    document.querySelectorAll('.page-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));

    document.getElementById(`page-${pageId}`).style.display = 'block';
    document.getElementById(`nav-${pageId}`).classList.add('active');

    if (pageId === 'dashboard') {
        renderChart(window.latestCategoryTotals || {});
    }
}

function getCategoryEmoji(category) {
    switch (category) {
        case 'Normal Eating': return '🥗';
        case 'Internet & Online': return '🌐';
        case 'Housing/Bills': return '🏠';
        case 'Transport': return '🚗';
        case 'Entertainment': return '🎬';
        default: return '📁';
    }
}

async function loadData() {
    try {
        const { data: history, error } = await _supabase
            .from('transactions')
            .select('*')
            .order('id', { ascending: false });

        if (error) throw error;

        globalTransactions = history || [];

        let net = 0;
        let income = 0;
        let expense = 0;
        let monthExpense = 0;
        let weekExpense = 0;
        const categoryTotals = {};

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0,0,0,0);

        history.forEach(t => {
            const amt = Number(t.amount) || 0;
            const tDate = new Date(t.date);

            if (t.type === 'income') {
                income += amt;
                net += amt;
            } else {
                expense += amt;
                net -= amt;

                const cat = t.category || 'Other';
                categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;

                if (tDate.getFullYear() === currentYear && tDate.getMonth() === currentMonth) {
                    monthExpense += amt;
                }

                if (tDate >= startOfWeek) {
                    weekExpense += amt;
                }
            }
        });

        window.latestCategoryTotals = categoryTotals;

        document.getElementById('netBalance').textContent = `$${net.toFixed(2)}`;
        document.getElementById('totalIncome').textContent = `$${income.toFixed(2)}`;
        document.getElementById('totalExpense').textContent = `$${expense.toFixed(2)}`;
        document.getElementById('monthExpense').textContent = `$${monthExpense.toFixed(2)}`;
        document.getElementById('weekExpense').textContent = `$${weekExpense.toFixed(2)}`;

        document.getElementById('overviewAllTime').textContent = `$${expense.toFixed(2)}`;
        document.getElementById('overviewMonth').textContent = `$${monthExpense.toFixed(2)}`;
        document.getElementById('overviewWeek').textContent = `$${weekExpense.toFixed(2)}`;
        
        const daysPassedInMonth = now.getDate() || 1;
        const dailyAverage = monthExpense / daysPassedInMonth;
        document.getElementById('dailyAvg').textContent = `$${dailyAverage.toFixed(2)}`;

        const summaryContainer = document.getElementById('categorySummaryContainer');
        summaryContainer.innerHTML = '';
        const categories = Object.keys(categoryTotals);
        if (categories.length === 0) {
            summaryContainer.innerHTML = `<div class="empty-state" style="font-size: 0.85rem; color: #64748b;">No categories recorded yet.</div>`;
        } else {
            categories.forEach((cat, index) => {
                const row = document.createElement('div');
                row.className = 'weekly-row';
                if (index === categories.length - 1) row.style.borderBottom = 'none';
                const emoji = getCategoryEmoji(cat);
                row.innerHTML = `<span>${emoji} ${cat}:</span><strong>$${categoryTotals[cat].toFixed(2)}</strong>`;
                summaryContainer.appendChild(row);
            });
        }

        const list = document.getElementById('transactionList');
        list.innerHTML = '';
        if (!history || history.length === 0) {
            list.innerHTML = `<div class="empty-state">No transactions recorded yet.</div>`;
            return;
        }

        history.forEach(t => {
            const li = document.createElement('li');
            const sign = t.type === 'income' ? '+' : '-';
            const colorClass = t.type === 'income' ? '#10b981' : '#ef4444';
            const emoji = getCategoryEmoji(t.category);

            li.style.display = 'flex';
            li.style.justifyContent = 'space-between';
            li.style.alignItems = 'center';

            li.innerHTML = `
                <div style="display:flex; flex-direction:column;">
                    <span style="font-weight:600;">${emoji} ${t.title}</span>
                    <span style="font-size:0.75rem; color:#64748b;">${t.category} • ${t.date}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <strong style="color: ${colorClass};">${sign}$${Number(t.amount).toFixed(2)}</strong>
                    <button type="button" onclick="deleteTransaction(${t.id})" style="background: transparent; border: none; cursor: pointer; font-size: 1.1rem;" title="Delete">🗑️</button>
                </div>
            `;
            list.appendChild(li);
        });

        renderChart(categoryTotals);

    } catch (err) {
        console.error("Error loading data from Supabase:", err.message);
    }
}

function renderChart(categoryTotals = {}) {
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;

    const labels = Object.keys(categoryTotals);
    const dataValues = Object.values(categoryTotals);

    if (categoryChartInstance) {
        categoryChartInstance.destroy();
    }

    if (labels.length === 0) {
        return;
    }

    categoryChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: dataValues,
                backgroundColor: ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { boxWidth: 12, font: { size: 11 } }
                }
            }
        }
    });
}

async function addTransaction(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    const newEntry = {
        id: Date.now(),
        type: document.getElementById('type').value,
        category: document.getElementById('category').value,
        title: document.getElementById('title').value,
        amount: parseFloat(document.getElementById('amount').value),
        date: document.getElementById('date').value
    };

    try {
        const { error } = await _supabase.from('transactions').insert([newEntry]);
        if (error) throw error;

        document.getElementById('transactionForm').reset();
        document.getElementById('date').valueAsDate = new Date();
        loadData();
        switchPage('transactions');
    } catch (err) {
        alert("Error saving transaction: " + err.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Add Transaction';
    }
}

async function deleteTransaction(id) {
    if (!confirm("Are you sure you want to delete this transaction?")) return;

    try {
        const { error } = await _supabase.from('transactions').delete().eq('id', id);
        if (error) throw error;
        loadData();
    } catch (err) {
        alert("Error deleting transaction: " + err.message);
    }
}

function exportToCSV() {
    if (globalTransactions.length === 0) {
        alert("No data available to export!");
        return;
    }

    const filter = document.getElementById('exportFilter').value;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0,0,0,0);

    let filteredData = globalTransactions.filter(t => {
        const tDate = new Date(t.date);
        if (filter === 'month') {
            return tDate.getFullYear() === currentYear && tDate.getMonth() === currentMonth;
        } else if (filter === 'week') {
            return tDate >= startOfWeek;
        }
        return true;
    });

    if (filteredData.length === 0) {
        alert("No transactions match the selected export timeframe!");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,ID,Type,Category,Description,Amount,Date\r\n";
    filteredData.forEach(t => {
        const row = [t.id, t.type, `"${t.category}"`, `"${t.title}"`, t.amount, t.date];
        csvContent += row.join(",") + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `transactions_${filter}_backup.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

loadData();
