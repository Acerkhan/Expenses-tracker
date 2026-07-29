const BIN_ID = '6a6a59b8da38895dfea12ba2';
const API_KEY = '$2a$10$cimt1gJ8Zz.q6wLliDoAAu9HjJ7wtpgLXeN6Ezivv0H45hGPwOAeC';
const API_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

document.getElementById('date').valueAsDate = new Date();
document.getElementById('transactionForm').addEventListener('submit', addTransaction);

function loadData() {
    fetch(API_URL, {
        headers: { 'X-Master-Key': API_KEY }
    })
    .then(res => res.json())
    .then(response => {
        const data = response.record; // JSONBin wraps data inside a "record" object
        
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
    .catch(err => console.error("Error loading data:", err));
}

function addTransaction(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    // 1. First fetch current data to recalculate totals
    fetch(API_URL, {
        headers: { 'X-Master-Key': API_KEY }
    })
    .then(res => res.json())
    .then(response => {
        let data = response.record;

        const newEntry = {
            id: Date.now(),
            type: document.getElementById('type').value,
            category: document.getElementById('category').value,
            title: document.getElementById('title').value,
            amount: parseFloat(document.getElementById('amount').value),
            date: document.getElementById('date').value
        };

        // Update totals
        if (newEntry.type === 'income') {
            data.income = Number(data.income || 0) + newEntry.amount;
            data.net = Number(data.net || 0) + newEntry.amount;
        } else {
            data.expense = Number(data.expense || 0) + newEntry.amount;
            data.net = Number(data.net || 0) - newEntry.amount;

            if (newEntry.category === 'Normal Eating') {
                data.eating = Number(data.eating || 0) + newEntry.amount;
            } else if (newEntry.category === 'Internet & Online') {
                data.internet = Number(data.internet || 0) + newEntry.amount;
            }
        }

        if (!data.history) data.history = [];
        data.history.unshift(newEntry); // Add to beginning of array

        // 2. Push updated JSON back to JSONBin storage via PUT request
        return fetch(API_URL, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': API_KEY
            },
            body: JSON.stringify(data)
        });
    })
    .then(res => res.json())
    .then(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Add Transaction';
        document.getElementById('transactionForm').reset();
        document.getElementById('date').valueAsDate = new Date();
        loadData(); // Refresh UI
    })
    .catch(err => {
        console.error("Save error:", err);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Add Transaction';
    });
}

loadData();
