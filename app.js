// Paste your deployed Google Apps Script Web App URL here
const API_URL = 'https://script.google.com/macros/s/AKfycbwnmxcqrmvAGxN1oQ9kyhjei5_cteZzz3nCh4WpjIMkmkNHjz18q2LueUOhdUC18FVy/exec';

document.getElementById('date').valueAsDate = new Date();
document.getElementById('transactionForm').addEventListener('submit', addTransaction);

function loadData() {
    fetch(API_URL)
        .then(res => res.json())
        .then(data => {
            document.getElementById('netBalance').textContent = `$${Number(data.net || 0).toFixed(2)}`;
            const list = document.getElementById('transactionList');
            list.innerHTML = '';
            
            if (!data.history || data.history.length === 0) {
                list.innerHTML = `<li>No entries found</li>`;
                return;
            }
            
            data.history.forEach(t => {
                const li = document.createElement('li');
                li.innerHTML = `<span>${t.title} (${t.category})</span> <strong>$${t.amount}</strong>`;
                list.appendChild(li);
            });
        })
        .catch(err => console.error("Error loading data:", err));
}

function addTransaction(e) {
    e.preventDefault();
    const payload = {
        id: Date.now(),
        type: document.getElementById('type').value,
        category: document.getElementById('category').value,
        title: document.getElementById('title').value,
        amount: parseFloat(document.getElementById('amount').value),
        date: document.getElementById('date').value
    };

    fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(res => {
        if(res.status === 'success') {
            document.getElementById('transactionForm').reset();
            document.getElementById('date').valueAsDate = new Date();
            loadData();
        }
    });
}

loadData();
