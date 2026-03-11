const EventEmitter = require('events');

// Create a custom class extending EventEmitter for centralized event handling
class EventBus extends EventEmitter { }

// Instantiate a singleton instance of the EventBus
// This ensures that all parts of the application use the same event bus
const eventBus = new EventBus();

module.exports = eventBus;
