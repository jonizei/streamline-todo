// Test setup file - runs before all tests
// Sets the test data directories and environment before any modules are loaded
process.env.NODE_ENV = 'test';
process.env.QUEUES_DIR = 'data/queues-test';
process.env.USERS_DIR = 'data/users-test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
