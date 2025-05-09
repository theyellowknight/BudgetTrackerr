// Global variables to store transactions and budgets
let transactions = [];
let budgets = [];
let currentBudget = 0;

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Set today's date as default for transaction date
  const today = new Date().toISOString().split('T')[0];
  if (document.getElementById('transaction-date')) {
    document.getElementById('transaction-date').value = today;
  }
  
  // First load transactions to ensure we have all transaction data
  loadTransactions();
  
  // Then load or recalculate budget
  loadBudget();
  
  // Tab navigation
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all tabs
      tabButtons.forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
      });
      
      // Add active class to clicked tab
      button.classList.add('active');
      button.setAttribute('aria-selected', 'true');
      
      // Hide all tab content
      const tabContents = document.querySelectorAll('.tab-content');
      tabContents.forEach(content => {
        content.classList.remove('active');
      });
      
      // Show selected tab content
      const tabId = button.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');
    });
  });
  
  // Load transactions and budget
  loadTransactions();
  loadBudget();
  
  // Transaction form submission
  const transactionForm = document.getElementById('transaction-form');
  
  if (transactionForm) {
    // Add the event listener directly to the form
    transactionForm.addEventListener('submit', function(e) {
      // Explicitly prevent the default form submission
      e.preventDefault();
      console.log('Form submission prevented');
      
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
      document.getElementById('transaction-date').value = new Date().toISOString().split('T')[0];
      
      // Show success message
      showStatus('Transaction added successfully', 'success');
      
      // Return false to ensure the form doesn't submit
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
  
  // Close modal when clicking outside
  window.addEventListener('click', (e) => {
    const modal = document.getElementById('budget-reset-modal');
    if (e.target === modal) {
      hideBudgetResetModal();
    }
  });
});

// Function to add transaction to the list
function addTransactionToList(transaction) {
  const list = document.querySelector('.transaction-list');
  if (!list) return;
  
  const item = document.createElement('div');
  item.className = 'transaction-item';
  
  const sign = transaction.type === 'expense' ? '-' : '+';
  const amountClass = transaction.type === 'expense' ? 'expense' : 'income';
  
  item.innerHTML = `
    <div>
      <div>${transaction.description}</div>
      <div class="transaction-date">${transaction.date}</div>
    </div>
    <div class="transaction-amount ${amountClass}">${sign}$${transaction.amount.toFixed(2)}</div>
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
  localStorage.setItem('budgetTrackerTransactions', JSON.stringify(transactions));
}

// Function to load transactions from local storage
function loadTransactions() {
  const savedTransactions = localStorage.getItem('budgetTrackerTransactions');
  if (savedTransactions) {
    transactions = JSON.parse(savedTransactions);
    
    // Reset current budget before recalculating
    currentBudget = 0;
    
    // Calculate current budget based on all transactions
    transactions.forEach(transaction => {
      // Update budget based on transaction type
      if (transaction.type === 'income') {
        currentBudget += transaction.amount;
      } else if (transaction.type === 'expense') {
        currentBudget -= transaction.amount;
      }
      
      // Display transaction in the list
      addTransactionToList(transaction);
    });
    
    // Save and update the recalculated budget
    saveBudget();
    updateBudgetDisplay();
  }
}

// Load saved transactions when the page loads
window.addEventListener('load', loadTransactions);

// Function to adjust the budget
function adjustBudget(amount) {
  currentBudget += amount;
  saveBudget();
  updateBudgetDisplay();
  
  const action = amount > 0 ? 'added to' : 'subtracted from';
  showStatus(`$${Math.abs(amount).toFixed(2)} ${action} your budget`, 'success');
}

// Function to save budget to local storage
function saveBudget() {
  console.log('Saving budget:', currentBudget);
  localStorage.setItem('budgetTrackerCurrentBudget', currentBudget.toString());
}

// Function to load budget from local storage
function loadBudget() {
  const savedBudget = localStorage.getItem('budgetTrackerCurrentBudget');
  if (savedBudget) {
    currentBudget = parseFloat(savedBudget);
  } else {
    // If no saved budget exists, recalculate from transactions
    recalculateBudgetFromTransactions();
  }
  updateBudgetDisplay();
}

// Function to recalculate budget from all transactions
function recalculateBudgetFromTransactions() {
  currentBudget = 0;
  
  transactions.forEach(transaction => {
    if (transaction.type === 'income') {
      currentBudget += transaction.amount;
    } else if (transaction.type === 'expense') {
      currentBudget -= transaction.amount;
    }
  });
  
  saveBudget();
}

// Function to update budget display
function updateBudgetDisplay() {
  console.log('Updating budget display:', currentBudget);
  const balanceEl = document.getElementById('current-balance');
  const balanceContainer = document.querySelector('.current-balance-container');
  
  if (!balanceEl || !balanceContainer) {
    console.error('Balance element or container not found');
    return;
  }
  
  // Format balance with commas
  const formattedBalance = formatNumberWithCommas(Math.abs(currentBudget).toFixed(2));
  
  // Add negative sign if needed
  const displayValue = currentBudget < 0 ? `-$${formattedBalance}` : `$${formattedBalance}`;
  balanceEl.textContent = displayValue;
  
  // Clear existing classes and add appropriate class
  balanceEl.className = 'balance-display transaction-amount';
  
  // Remove any existing negative class from container if it exists
  if (balanceContainer) {
    balanceContainer.classList.remove('negative');
    
    if (currentBudget > 0) {
      balanceEl.classList.add('income');
    } else if (currentBudget < 0) {
      balanceEl.classList.add('expense');
      // Add negative class to container instead of using inline styles
      balanceContainer.classList.add('negative');
      console.log('Added negative class to container');
    }
  }
  
  // Update summary values
  updateBalanceSummary();
  
  console.log('Balance updated:', displayValue);
  console.log('Container classes:', balanceContainer ? balanceContainer.className : 'Container not found');
}

// Function to update balance summary
function updateBalanceSummary() {
  // Calculate total income and expenses
  let totalIncome = 0;
  let totalExpenses = 0;
  
  transactions.forEach(transaction => {
    if (transaction.type === 'income') {
      totalIncome += transaction.amount;
    } else if (transaction.type === 'expense') {
      totalExpenses += transaction.amount;
    }
  });
  
  // Update the summary elements
  const incomeEl = document.getElementById('total-income');
  const expensesEl = document.getElementById('total-expenses');
  
  if (incomeEl) {
    incomeEl.textContent = `$${formatNumberWithCommas(totalIncome.toFixed(2))}`;
  }
  
  if (expensesEl) {
    expensesEl.textContent = `$${formatNumberWithCommas(totalExpenses.toFixed(2))}`;
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
  currentBudget = parseFloat(newBudgetAmount);
  console.log('Reset budget to:', currentBudget);
  saveBudget();
  updateBudgetDisplay();
  
  // Show status message below the reset button
  showResetStatus('Budget and transactions have been reset', 'success');
}

// Function to show status message below reset button
function showResetStatus(message, type) {
  // Get the reset button
  const resetButton = document.getElementById('reset-budget-transactions');
  if (!resetButton) return;
  
  // Check if status element already exists
  let statusEl = document.getElementById('reset-status');
  if (!statusEl) {
    // Create new status element
    statusEl = document.createElement('div');
    statusEl.id = 'reset-status';
    statusEl.className = `status ${type}`;
    
    // Insert after reset button
    resetButton.parentNode.insertBefore(statusEl, resetButton.nextSibling);
  } else {
    // Update existing status element
    statusEl.className = `status ${type}`;
  }
  
  // Set message and display
  statusEl.textContent = message;
  statusEl.style.display = 'block';
  
  // Hide after 3 seconds
  setTimeout(() => {
    statusEl.style.display = 'none';
  }, 3000);
}

// Function to parse CSV data and update budget
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
      type: typeIndex !== -1 ? values[typeIndex].trim().toLowerCase() : 'expense',
      timestamp: new Date().toISOString()
    };
    
    // Validate transaction data
    if (transaction.date && transaction.description && !isNaN(transaction.amount) && transaction.amount > 0) {
      result.push(transaction);
    }
  }
  
  return result;
}

// Import functionality
document.getElementById('import-btn').addEventListener('click', () => {
    const fileInput = document.getElementById('import-file');
    const file = fileInput.files[0];
    
    if (!file) {
        showStatus('Please select a CSV file to import', 'error');
        return;
    }
    
    // Read the file content
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const csvData = event.target.result;
            const importedTransactions = parseCSV(csvData);
            
            if (importedTransactions.length > 0) {
                // Add imported transactions to existing ones
                let totalBudgetChange = 0;
                
                importedTransactions.forEach(transaction => {
                    // Add to transactions array
                    transactions.push(transaction);
                    
                    // Add to the list
                    addTransactionToList(transaction);
                    
                    // Calculate budget impact
                    if (transaction.type === 'income') {
                        totalBudgetChange += transaction.amount;
                    } else if (transaction.type === 'expense') {
                        totalBudgetChange -= transaction.amount;
                    }
                });
                
                // Save updated transactions first
                saveTransactions();
                
                // Update budget based on all imported transactions
                if (totalBudgetChange !== 0) {
                    console.log('Before update: Current budget =', currentBudget);
                    console.log('Budget change =', totalBudgetChange);
                    
                    // Directly update the current budget
                    currentBudget += totalBudgetChange;
                    
                    console.log('After update: Current budget =', currentBudget);
                    
                    // Save and update display
                    saveBudget();
                    updateBudgetDisplay();
                    
                    // Format the amount for the status message
                    const formattedAmount = formatNumberWithCommas(Math.abs(totalBudgetChange).toFixed(2));
                    const action = totalBudgetChange > 0 ? 'added to' : 'subtracted from';
                    showStatus(`$${formattedAmount} ${action} your budget from imported transactions`, 'success');
                }
                
                showStatus(`Successfully imported ${importedTransactions.length} transactions`, 'success');
                fileInput.value = ''; // Reset file input
            } else {
                showStatus('No valid transactions found in the CSV file', 'error');
            }
        } catch (error) {
            showStatus('Error parsing CSV file: ' + error.message, 'error');
            console.error('CSV parsing error:', error);
        }
    };
    
    reader.onerror = () => {
        showStatus('Error reading file', 'error');
        console.error('File reading error');
    };
    
    reader.readAsText(file);
});

// Function to format numbers with commas
function formatNumberWithCommas(number) {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Save budget
document.getElementById('save-budget').addEventListener('click', () => {
    // Get the current month
    const budgetMonth = document.getElementById('budget-month').value || 
                        new Date().toISOString().substring(0, 7); // YYYY-MM format
    
    // Collect all budget values
    const budgets = [
        {
            category: 'food',
            amount: parseFloat(document.getElementById('food-budget').value),
            period: 'monthly',
            month: budgetMonth
        },
        {
            category: 'housing',
            amount: parseFloat(document.getElementById('housing-budget').value),
            period: 'monthly',
            month: budgetMonth
        },
        {
            category: 'transportation',
            amount: parseFloat(document.getElementById('transportation-budget').value),
            period: 'monthly',
            month: budgetMonth
        }
    ];
    
    // Save each budget
    let savedCount = 0;
    budgets.forEach(budget => {
        chrome.runtime.sendMessage(
            { type: 'saveBudget', budget },
            (response) => {
                savedCount++;
                if (savedCount === budgets.length) {
                    showStatus('Budget saved successfully', 'success');
                }
            }
        );
    });
});

// Tab switching functionality with data loading
document.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', () => {
        // Remove active class from all tabs and content
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-selected', 'false');
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Add active class to clicked tab and corresponding content
        button.classList.add('active');
        button.setAttribute('aria-selected', 'true');
        const tabId = button.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');
        
        // Load data based on the selected tab
        if (tabId === 'budget') {
            loadBudgetData();
        }
    });
});

/**
 * Load budget data from storage and update the UI
 */
function loadBudgetData() {
    // Set current month as default if not already set
    if (!document.getElementById('budget-month').value) {
        document.getElementById('budget-month').value = new Date().toISOString().substring(0, 7);
    }
    
    const currentMonth = document.getElementById('budget-month').value;
    
    // Get budgets from storage
    chrome.runtime.sendMessage(
        { type: 'getBudgets' },
        (response) => {
            if (response.success) {
                const budgets = response.data;
                
                // Filter budgets for current month
                const currentBudgets = budgets.filter(b => b.month === currentMonth);
                
                // Update budget inputs
                currentBudgets.forEach(budget => {
                    const budgetInput = document.getElementById(`${budget.category}-budget`);
                    if (budgetInput) {
                        budgetInput.value = budget.amount;
                    }
                });
                
                // Get transactions to calculate spending
                chrome.runtime.sendMessage(
                    { type: 'getTransactions' },
                    (transactionResponse) => {
                        if (transactionResponse.success) {
                            updateBudgetSummary(transactionResponse.data, currentMonth);
                        }
                    }
                );
            }
        }
    );
}

/**
 * Update the budget summary with transaction data
 * @param {Array} transactions - All transactions
 * @param {string} month - Current month in YYYY-MM format
 */
function updateBudgetSummary(transactions, month) {
    // Filter transactions for current month
    const monthTransactions = transactions.filter(t => t.date.startsWith(month));
    
    // Calculate totals
    const income = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const expenses = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const balance = income - expenses;
    
    // Update summary
    document.getElementById('total-income').textContent = `$${income.toFixed(2)}`;
    document.getElementById('total-expenses').textContent = `$${expenses.toFixed(2)}`;
    document.getElementById('current-balance').textContent = `$${balance.toFixed(2)}`;
    
    // Calculate category spending
    const categories = ['food', 'housing', 'transportation'];
    categories.forEach(category => {
        const spent = monthTransactions
            .filter(t => t.category === category && t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
        
        const spentElement = document.querySelector(`#${category}-budget`).parentNode.querySelector('.expense');
        if (spentElement) {
            spentElement.textContent = `$${spent.toFixed(2)}`;
        }
    });
}

// Initialize the budget month input with current month
document.addEventListener('DOMContentLoaded', () => {
    const today = new Date().toISOString().substring(0, 7);
    document.getElementById('budget-month').value = today;
    
    // Add change event listener to budget month
    document.getElementById('budget-month').addEventListener('change', () => {
        loadBudgetData();
    });
});

/**
 * Initialize the content script
 */
function initialize() {
    waitForSheetsUI()
        .then(() => {
            console.log('Google Sheets UI loaded');
            setupMessageListeners();
            
            // Load initial data for active tab
            const activeTab = document.querySelector('.tab-btn.active');
            if (activeTab && activeTab.getAttribute('data-tab') === 'budget') {
                loadBudgetData();
            }
        })
        .catch(error => {
            console.error('Error initializing content script:', error);
        });
}
