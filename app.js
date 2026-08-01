const SUPABASE_URL = 'https://inptsochtqsarxyjdqkv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlucHRzb2NodHFzYXJ4eWpkcWt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1NzE1MzMsImV4cCI6MjEwMTE0NzUzM30.Nhvb2IrCBfqvznvD_j0lMwFbWqsRSdmrkaOfHpVXqR4';

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.getElementById('date').valueAsDate = new Date();
document.getElementById('transactionForm').addEventListener('submit', addTransaction);

async function loadData() {
    try {
        const { data: history, error } = await _supabase
            .from('transactions')
            .select('*')
            .order('id', { ascending: false });

        if (error) throw error;

        let net = 0;
        let income = 0;
        let expense = 0;
        let eating = 0;
        let internet = 0;

        history.forEach(t => {
            const amt = Number(t.amount) || 0;
            if (t.type === 'income') {
                income += amt;
                net += amt;
            } else {
                expense += amt;
                net -= amt;
                if (t.category === 'Normal Eating') eating += amt;
                if (t.category === 'Internet & Online') internet += amt;
            }
        });

        document.getElementById('netBalance').textContent = `$${net.toFixed(2)}`;
        document.getElementById('totalIncome').textContent = `$${income.toFixed(2)}`;
        document.getElementById('totalExpense').textContent = `$${expense.toFixed(2)}`;
        document.getElementById('eatingTotal').textContent = `$${eating.toFixed(2)}`;
        document.getElementById('internetTotal').textContent = `$${internet.toFixed(2)}`;

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
            
            li.innerHTML = `
                <div style="display:flex; flex-direction:column;">
                    <span style="font-weight:600;">${t.title}</span>
                    <span style="font-size:0.75rem; color:#64748b;">${t.category} • ${t.date}</span>
                </div>
                <strong style="color: ${colorClass};">${sign}$${Number(t.amount).toFixed(2)}</strong>
            `;
            list.appendChild(li);
        });

    } catch (err) {
        console.error("Error loading data from Supabase:", err.message);
    }
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
        const { error } = await _supabase
            .from('transactions')
            .insert([newEntry]);

        if (error) throw error;

        document.getElementById('transactionForm').reset();
        document.getElementById('date').valueAsDate = new Date();
        loadData();
    } catch (err) {
        alert("Error saving transaction: " + err.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Add Transaction';
    }
}

loadData();
