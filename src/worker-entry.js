import unglish from './index';

// Explicitly assign unglish to self (which is the global scope in a worker)
self.unglish = unglish;
