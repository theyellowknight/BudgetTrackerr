/**
 * @module background
 * @description Background script for the BudgetTracker Chrome extension that handles data storage
 * and communication with Google Sheets without using external APIs.
 * @license MIT
 * @copyright 2025 BudgetTracker
 */

// Storage keys
const STORAGE_KEYS = {
  TRANSACTIONS: 'budgettracker_transactions',
  BUDGETS: 'budgettracker_budgets',
  SETTINGS: 'budgettracker_settings',
  SPREADSHEET_ID: 'budgettracker_spreadsheet_id',
  LAST_SYNC: 'budgettracker_last_sync'
};

// Keep all existing background.js code as is
// ...

// Add any unique functionality from content.js here
// For example, if there are any content script specific functions:

// Initialize extension when installed
chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install' || details.reason === 'update') {
    initialize().catch(error => console.error('Initialization failed:', error));
  }
});
