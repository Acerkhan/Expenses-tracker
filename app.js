const API_URL = 'https://script.google.com/macros/s/AKfycbwnmxcqrmvAGxN1oQ9kyhjei5_cteZzz3nCh4WpjIMkmkNHjz18q2LueUOhdUC18FVy/exec';

document.getElementById('date').valueAsDate = new Date();
document.getElementById('transactionForm').addEventListener('submit', addTransaction);

function loadData() {
    fetch(API_URL)
        .then(res => res.json())
        .then(data => {
            document.getElementById('netBalance').textContent = `$${Number(data.net || 0).toFixed(2)}`;
            document.getElementById('totalIncome').textContent = `$${Number(data.income || 0).toFixed(2)}`;
            document.getElementById('totalExpense').textContent = `$${Number(data.expense || 0).toFixed(2)}`;
            document.getElementById('eatingTotal').textContent = `$${Number(data.eating || 0).toFixed(2)}`;
            document.getElementById('internetTotal').textContent = `$${Number(data.internet || 0).toFixed(2)}`;

            const list = document.getElementById('transactionList');
            list.innerHTML = '';
            
            if (!data.history || data.history.length === 0) {
                list.innerHTML = `<div class="empty-state">No transactions recorded yet.</div>`;
                return;
            }
            
            data.history.forEach(t => {
                const li = document.createElement('li');
                const sign = t.type === 'income' ? '+' : '-';
                const colorClass = t.type === 'income' ? '#10b981' : '#ef4444';
                
                li.innerHTML = `
                    <div style="display:flex; flex-direction:column;">
                        <span style="font-weight:600;">${t.title}</span>
                        <span style="font-size:0.75rem; color:#64748b;">${t.category} • ${t.date}</span>
                    </div>
                    <strong style="color: ${colorClass};">${sign}$${Number(t.amount).toFixed(2)}</strong>
                `;
                list.appendChild(li);
            });
        })
        .catch(err => {
            console.error("Error loading data:", err);
            document.getElementById('transactionList').innerHTML = `<div class="empty-state">Failed to connect to sheet.</div>`;
        });
}

function addTransaction(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    const params = new URLSearchParams({
        action: 'add',
        id: Date.now(),
        type: document.getElementById('type').value,
        category: document.getElementById('category').value,
        title: document.getElementById('title').value,
        amount: document.getElementById('amount').value,
        date: document.getElementById('date').value
    });

    // Send data cleanly via GET query parameters to prevent CORS blocks
    fetch(`${API_URL}?${params.toString()}`)
        .then(res => res.json())
        .then(res => {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Add Transaction';
            if(res && res.status === 'success') {
                document.getElementById('transactionForm').reset();
                document.getElementById('date').valueAsDate = new Date();
                loadData(); // Immediately refresh dashboard and history from sheet
            }
        })
        .catch(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Add Transaction';
        });
}

load
    Data();
