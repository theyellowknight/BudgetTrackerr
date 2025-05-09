// Consolidated Budget Tracker JavaScript

// Storage keys (ensure consistency across all files)
const STORAGE_KEYS = {
  TRANSACTIONS: 'budgettracker_transactions',
  BUDGETS: 'budgettracker_budgets',
  SETTINGS: 'budgettracker_settings',
  SPREADSHEET_ID: 'budgettracker_spreadsheet_id',
  LAST_SYNC: 'budgettracker_last_sync',
  BUDGET: 'budgettracker_current_budget'
};

// Variables
let transactions = [];
let currentBudget = 0;
const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Set today's date as default for transaction date
  if (document.getElementById('transaction-date')) {
    document.getElementById('transaction-date').value = today;
  }
  
  // Load saved data
  loadTransactions();
  loadBudget();
  loadSettings(); // Make sure settings are loaded regardless of active tab
  
  // Tab navigation
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.getAttribute('data-tab');
      
      // Update active tab button
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Update active tab content
      tabContents.forEach(content => content.classList.remove('active'));
      document.getElementById(tabName).classList.add('active');
    });
  });
  
  // Transaction form submission
  const transactionForm = document.getElementById('transaction-form');
  if (transactionForm) {
    transactionForm.addEventListener('submit', function(e) {
      // Prevent default form submission
      e.preventDefault();
      
      // Get form values
      const date = document.getElementById('transaction-date').value;
      const description = document.getElementById('transaction-description').value;
      const category = document.getElementById('transaction-category').value;
      const amount = parseFloat(document.getElementById('transaction-amount').value);
      const type = document.getElementById('transaction-type').value;
      
      // Validate inputs
      if (!date || !description || !category || isNaN(amount) || amount <= 0) {
        showStatus('Please fill in all fields correctly', 'error');
        return false;
      }
      
      // Create transaction object
      const transaction = {
        date,
        description,
        category,
        amount,
        type,
        timestamp: new Date().toISOString()
      };
      
      // Add to transactions array
      transactions.push(transaction);
      
      // Save to local storage
      saveTransactions();
      
      // Add to the list
      addTransactionToList(transaction);
      
      // Update budget based on transaction type
      if (type === 'income') {
        adjustBudget(amount);
      } else if (type === 'expense') {
        adjustBudget(-amount);
      }
      
      // Reset form
      transactionForm.reset();
      document.getElementById('transaction-date').value = today;
      
      // Show success message
      showStatus('Transaction added successfully', 'success');
      
      return false;
    });
  }
  
  // Budget adjustment buttons
  if (document.getElementById('add-to-budget')) {
    document.getElementById('add-to-budget').addEventListener('click', () => {
      const amount = parseFloat(document.getElementById('budget-amount').value);
      if (isNaN(amount) || amount <= 0) {
        showStatus('Please enter a valid amount', 'error');
        return;
      }
      
      adjustBudget(amount);
      document.getElementById('budget-amount').value = '';
    });
  }
  
  if (document.getElementById('subtract-from-budget')) {
    document.getElementById('subtract-from-budget').addEventListener('click', () => {
      const amount = parseFloat(document.getElementById('budget-amount').value);
      if (isNaN(amount) || amount <= 0) {
        showStatus('Please enter a valid amount', 'error');
        return;
      }
      
      adjustBudget(-amount);
      document.getElementById('budget-amount').value = '';
    });
  }
  
  // Reset budget and transactions button
  if (document.getElementById('reset-budget-transactions')) {
    document.getElementById('reset-budget-transactions').addEventListener('click', () => {
      showBudgetResetModal();
    });
  }
  
  // Modal close button
  if (document.querySelector('.close-modal')) {
    document.querySelector('.close-modal').addEventListener('click', () => {
      hideBudgetResetModal();
    });
  }
  
  // Confirm reset button
  if (document.getElementById('confirm-reset')) {
    document.getElementById('confirm-reset').addEventListener('click', () => {
      const newBudgetAmount = parseFloat(document.getElementById('new-budget-amount').value);
      if (isNaN(newBudgetAmount) || newBudgetAmount < 0) {
        showStatus('Please enter a valid budget amount', 'error');
        return;
      }
      
      resetBudgetAndTransactions(newBudgetAmount);
      hideBudgetResetModal();
    });
  }
  
  // CSV Template download - ensure it works regardless of active tab
  const downloadTemplate = document.getElementById('download-template');
  if (downloadTemplate) {
    downloadTemplate.addEventListener('click', (e) => {
      e.preventDefault();
      
      const csvContent = 'Date,Description,Category,Amount,Type\n' +
                         '2023-01-01,Salary,Income,5000,income\n' +
                         '2023-01-02,Rent,Housing,1500,expense\n' +
                         '2023-01-03,Groceries,Food,120.50,expense';
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = 'budget_tracker_template.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }
  
  // Import functionality - ensure it works regardless of active tab
  if (document.getElementById('import-btn')) {
    document.getElementById('import-btn').addEventListener('click', () => {
      const importFile = document.getElementById('import-file');
      
      if (!importFile.files.length) {
        showStatus('Please select a file to import', 'error');
        return;
      }
      
      const file = importFile.files[0];
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const csvData = e.target.result;
          const importedTransactions = parseCSV(csvData);
          
          if (importedTransactions.length > 0) {
            // Add imported transactions to existing ones
            importedTransactions.forEach(transaction => {
              transactions.push(transaction);
              addTransactionToList(transaction);
            });
            
            // Save updated transactions
            saveTransactions();
            
            showStatus(`Successfully imported ${importedTransactions.length} transactions`, 'success');
            importFile.value = ''; // Reset file input
          } else {
            showStatus('No valid transactions found in the CSV file', 'error');
          }
        } catch (error) {
          showStatus('Error parsing CSV file: ' + error.message, 'error');
        }
      };
      
      reader.readAsText(file);
    });
  }
  
  // Settings functionality
  const saveSettings = document.getElementById('save-settings');
  if (saveSettings) {
    saveSettings.addEventListener('click', () => {
      const settings = {
        spreadsheetId: document.getElementById('spreadsheet-id').value,
        defaultCurrency: document.getElementById('default-currency').value,
        dateFormat: document.getElementById('date-format').value
      };
      
      // Save settings to storage
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      
      // Apply settings
      applySettings(settings);
      
      showStatus('Settings saved successfully', 'success');
    });
  }
});

// Function to format numbers with commas
function formatNumberWithCommas(number) {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Function to add transaction to the list
function addTransactionToList(transaction) {
  const list = document.querySelector('.transaction-list');
  if (!list) return;
  
  const item = document.createElement('div');
  item.className = 'transaction-item';
  
  const sign = transaction.type === 'expense' ? '-' : '+';
  const amountClass = transaction.type === 'expense' ? 'expense' : 'income';
  
  // Format amount with commas
  const formattedAmount = formatNumberWithCommas(transaction.amount.toFixed(2));
  
  item.innerHTML = `
    <div>
      <div>${transaction.description}</div>
      <div class="transaction-date">${transaction.date}</div>
    </div>
    <div class="transaction-amount ${amountClass}">${sign}$${formattedAmount}</div>
  `;
  
  // Insert at the top of the list
  list.insertBefore(item, list.firstChild);
}

// Helper function to show status messages
function showStatus(message, type) {
  const statusEl = document.querySelector('.status');
  if (!statusEl) {
    console.log(`Status: ${message} (${type})`);
    return;
  }
  
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  statusEl.style.display = 'block';
  
  // Hide after 3 seconds
  setTimeout(() => {
    statusEl.style.display = 'none';
  }, 3000);
}

// Function to save transactions to local storage
function saveTransactions() {
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
}

// Function to load transactions from local storage
function loadTransactions() {
  const savedTransactions = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
  if (savedTransactions) {
    transactions = JSON.parse(savedTransactions);
    
    // Display saved transactions
    transactions.forEach(transaction => {
      addTransactionToList(transaction);
    });
  }
}

// Function to adjust the budget
function adjustBudget(amount) {
  currentBudget += amount;
  saveBudget();
  updateBudgetDisplay();
  
  const action = amount > 0 ? 'added to' : 'subtracted from';
  // Format amount with commas
  const formattedAmount = formatNumberWithCommas(Math.abs(amount).toFixed(2));
  showStatus(`$${formattedAmount} ${action} your budget`, 'success');
}

// Function to save budget to local storage
function saveBudget() {
  localStorage.setItem(STORAGE_KEYS.BUDGET, currentBudget.toString());
}

// Function to load budget from local storage
function loadBudget() {
  const savedBudget = localStorage.getItem(STORAGE_KEYS.BUDGET);
  if (savedBudget) {
    currentBudget = parseFloat(savedBudget);
  }
  updateBudgetDisplay();
}

// Function to update budget display
function updateBudgetDisplay() {
  const balanceEl = document.getElementById('balance');
  if (balanceEl) {
    // Format balance with commas
    const formattedBalance = formatNumberWithCommas(currentBudget.toFixed(2));
    balanceEl.textContent = `$${formattedBalance}`;
    
    // Update class based on balance
    balanceEl.className = 'transaction-amount';
    if (currentBudget > 0) {
      balanceEl.classList.add('income');
    } else if (currentBudget < 0) {
      balanceEl.classList.add('expense');
    }
  }
}

// Function to show budget reset modal
function showBudgetResetModal() {
  const modal = document.getElementById('budget-reset-modal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

// Function to hide budget reset modal
function hideBudgetResetModal() {
  const modal = document.getElementById('budget-reset-modal');
  if (modal) {
    modal.style.display = 'none';
    document.getElementById('new-budget-amount').value = '';
  }
}

// Function to reset budget and transactions
function resetBudgetAndTransactions(newBudgetAmount) {
  // Clear transactions
  transactions = [];
  saveTransactions();
  
  // Clear transaction list in UI
  const transactionList = document.querySelector('.transaction-list');
  if (transactionList) {
    transactionList.innerHTML = '';
  }
  
  // Set new budget
  currentBudget = newBudgetAmount;
  saveBudget();
  updateBudgetDisplay();
  
  showStatus('Budget and transactions have been reset', 'success');
}

// Function to parse CSV data
function parseCSV(csvData) {
  const result = [];
  const lines = csvData.split('\n');
  
  // Get header row
  const headers = lines[0].split(',');
  
  // Find column indices
  const dateIndex = headers.findIndex(h => h.toLowerCase().includes('date'));
  const descIndex = headers.findIndex(h => h.toLowerCase().includes('desc'));
  const catIndex = headers.findIndex(h => h.toLowerCase().includes('cat'));
  const amountIndex = headers.findIndex(h => h.toLowerCase().includes('amount'));
  const typeIndex = headers.findIndex(h => h.toLowerCase().includes('type'));
  
  if (dateIndex === -1 || descIndex === -1 || amountIndex === -1) {
    throw new Error('CSV file must contain Date, Description, and Amount columns');
  }
  
  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue; // Skip empty lines
    
    const values = lines[i].split(',');
    
    // Create transaction object
    const transaction = {
      date: values[dateIndex].trim(),
      description: values[descIndex].trim(),
      category: catIndex !== -1 ? values[catIndex].trim() : 'other',
      amount: parseFloat(values[amountIndex].trim()),
      type: typeIndex !== -1 ? values[typeIndex].trim() : 'expense'
    };
    
    // Validate transaction data
    if (transaction.date && transaction.description && !isNaN(transaction.amount)) {
      result.push(transaction);
    }
  }
  
  return result;
}

// Function to load settings
function loadSettings() {
  const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  if (savedSettings) {
    const settings = JSON.parse(savedSettings);
    
    // Populate settings form
    if (settings.spreadsheetId) {
      document.getElementById('spreadsheet-id').value = settings.spreadsheetId;
    }
    
    if (settings.defaultCurrency) {
      document.getElementById('default-currency').value = settings.defaultCurrency;
    }
    
    if (settings.dateFormat) {
      document.getElementById('date-format').value = settings.dateFormat;
    }
    
    // Removed dark mode checkbox setting
    
    // Apply settings
    applySettings(settings);
  }
}

// Function to apply settings
function applySettings(settings) {
  // Remove dark mode functionality
  // Only apply other settings as needed
  
  // Example: Apply currency format or date format if needed
  // if (settings.defaultCurrency) {
  //   // Apply currency format
  // }
  
  // if (settings.dateFormat) {
  //   // Apply date format
  // }
}
