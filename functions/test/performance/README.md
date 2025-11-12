# Performance Testing Suite

This directory contains comprehensive performance and load tests for the TarkovTracker Functions backend. The tests are designed to identify bottlenecks, measure system performance under various load conditions, and ensure the system can handle expected concurrent operations efficiently.

## Overview

The performance testing suite includes:

- **Token Performance Tests** (`tokenPerformance.test.ts`) - Tests token creation, validation, and revocation under load
- **Progress Performance Tests** (`progressPerformance.test.ts`) - Tests progress retrieval and updates under concurrent operations
- **Team Performance Tests** (`teamPerformance.test.ts`) - Tests team creation, joining, and progress retrieval under load
- **Load Tests** (`loadTests.test.ts`) - Comprehensive system-wide load tests simulating real-world usage patterns
- **Performance Utilities** (`performanceUtils.ts`) - Shared utilities for performance measurement and load testing

## Performance Metrics Measured

### Response Time Metrics
- **Average Response Time**: Mean time for operations to complete
- **P95 Response Time**: 95th percentile response time
- **P99 Response Time**: 99th percentile response time
- **Min/Max Response Time**: Fastest and slowest operation times

### Throughput Metrics
- **Operations per Second**: Number of operations completed per second
- **Concurrent User Support**: Maximum concurrent users the system can handle
- **Success Rate**: Percentage of operations completed successfully

### Resource Usage Metrics
- **Memory Usage**: Heap memory consumption during operations
- **Memory Growth**: Memory increase over sustained operations
- **CPU Usage**: Processor utilization during load tests

### Performance Targets

| Operation Type | Target Avg Response | Target P95 | Target Throughput |
|----------------|-------------------|--------------|-------------------|
| Token Creation | < 100ms | < 200ms | > 10 ops/sec |
| Token Validation | < 50ms | < 100ms | > 20 ops/sec |
| Progress Retrieval | < 100ms | < 200ms | > 15 ops/sec |
| Progress Update | < 120ms | < 250ms | > 8 ops/sec |
| Team Creation | < 150ms | < 300ms | > 8 ops/sec |
| Team Join | < 120ms | < 250ms | > 10 ops/sec |
| Team Progress | < 200ms | < 400ms | > 5 ops/sec |

## Running Performance Tests

### Quick Start

```bash
# Run all performance tests
npm run test:performance:all

# Run specific performance test suites
npm run test:performance:token
npm run test:performance:progress
npm run test:performance:team
npm run test:performance:load

# Run performance tests with coverage
npm run test:coverage:performance

# Watch mode for development
npm run test:performance:watch
```

### Advanced Usage

```bash
# Run with custom configuration
npx vitest run test/performance/ --config vitest.performance.config.js --reporter=verbose

# Run specific test patterns
npx vitest run test/performance/ --grep "concurrent" --reporter=verbose

# Generate performance report
npx vitest run test/performance/ --reporter=json --outputFile=performance-report.json
```

## Test Categories

### 1. Performance Tests
Focus on individual operation performance under moderate load:

- **Token Creation Performance**: Tests token creation with various concurrency levels
- **Token Validation Performance**: Tests token lookup and validation efficiency
- **Progress Retrieval Performance**: Tests user progress data retrieval
- **Progress Update Performance**: Tests task status updates and multiple task updates
- **Team Operations Performance**: Tests team creation, joining, and progress retrieval

### 2. Load Tests
Tests system behavior under sustained and peak load:

- **Concurrent User Workflows**: Simulates realistic user behavior patterns
- **Team Collaboration Scenarios**: Tests multiple users interacting with shared teams
- **Mixed Read/Write Operations**: Tests balanced database operations
- **Peak Hour Simulation**: Simulates high-traffic periods
- **Flash Crowd Scenarios**: Tests sudden traffic spikes

### 3. Stress Tests
Tests system limits and recovery capabilities:

- **Maximum Concurrency**: Tests system behavior at maximum concurrent users
- **Resource Exhaustion**: Tests behavior under memory and database pressure
- **Sustained High Load**: Tests performance degradation over time
- **Recovery Tests**: Tests system recovery from overload conditions

## Performance Test Utilities

### PerformanceMonitor
Utility for measuring individual operation performance:

```typescript
const monitor = new PerformanceMonitor();

// Measure a single operation
const endOperation = monitor.startOperation('operationName');
// ... perform operation ...
const metrics = endOperation();

// Measure async operation
const { result, metrics } = await monitor.measureOperation(
  'operationName',
  async () => {
    // ... async operation ...
    return result;
  }
);

// Get statistics
const stats = monitor.calculateStats('operationName');
```

### LoadTester
Utility for running load tests with configurable concurrency:

```typescript
const loadTester = new LoadTester();

// Run load test
const metrics = await loadTester.runLoadTest(
  'operationName',
  async () => {
    // ... operation to test ...
  },
  {
    totalOperations: 100,
    concurrency: 10,
    rampUpTime: 2000, // ms
  }
);

// Run concurrency test
const concurrencyMetrics = await loadTester.runConcurrencyTest(
  'operationName',
  async (userId) => {
    // ... operation with user context ...
  },
  {
    concurrentUsers: 20,
    operationsPerUser: 5,
    duration: 10000, // ms
  }
);
```

### TestDataGenerator
Utility for generating test data:

```typescript
// Generate unique test data
const userId = TestDataGenerator.generateUserId();
const teamId = TestDataGenerator.generateTeamId();
const token = TestDataGenerator.generateToken();
const taskUpdates = TestDataGenerator.generateTaskUpdates(5);
const progressData = TestDataGenerator.generateProgressData();
```

## Performance Baselines

The following baselines are used to evaluate performance test results:

### Token Operations
- **Creation**: 50ms average, 100ms P95 under normal load
- **Validation**: 25ms average, 50ms P95 under normal load
- **Revocation**: 75ms average, 150ms P95 under normal load

### Progress Operations
- **Retrieval**: 60ms average, 120ms P95 under normal load
- **Single Update**: 80ms average, 160ms P95 under normal load
- **Multiple Updates**: 150ms average, 300ms P95 under normal load

### Team Operations
- **Creation**: 100ms average, 200ms P95 under normal load
- **Joining**: 80ms average, 160ms P95 under normal load
- **Progress Retrieval**: 150ms average, 300ms P95 under normal load

## Interpreting Results

### Success Criteria
Performance tests pass when:

1. **Response Times**: Meet or exceed target metrics
2. **Throughput**: Achieve minimum operations per second
3. **Success Rate**: > 95% for normal operations, > 80% for stress tests
4. **Memory Usage**: No significant memory leaks (> 100MB growth)
5. **Performance Degradation**: < 50% degradation over sustained operations

### Performance Alerts
Watch for these indicators of performance issues:

- **High P95/P99 Times**: Indicates performance outliers
- **Low Success Rate**: May indicate system overload or bottlenecks
- **Memory Growth**: Potential memory leaks
- **Performance Degradation**: System struggling under load
- **High Error Rates**: System instability

### Bottleneck Identification
Common performance bottlenecks to watch for:

1. **Database Operations**: Slow queries, connection limits
2. **Transaction Conflicts**: High concurrency on same documents
3. **Memory Pressure**: Garbage collection pauses
4. **Network Latency**: External service calls
5. **CPU Bound**: Computationally intensive operations

## Continuous Integration

Performance tests are integrated into CI/CD pipeline:

```yaml
# Example CI configuration
- name: Run Performance Tests
  run: |
    npm run test:performance:all
    npm run test:coverage:performance
    
- name: Upload Performance Results
  uses: actions/upload-artifact@v2
  with:
    name: performance-results
    path: |
      test-results/
      coverage/performance/
```

## Best Practices

### Test Design
- Use realistic data sizes and user patterns
- Test both happy path and error scenarios
- Include ramp-up periods for load tests
- Measure multiple metrics for comprehensive analysis

### Performance Optimization
- Focus on high-impact operations first
- Monitor database query performance
- Implement appropriate caching strategies
- Use connection pooling for database operations

### Monitoring in Production
- Set up performance monitoring alerts
- Track key metrics over time
- Establish performance baselines
- Monitor error rates and response times

## Troubleshooting

### Common Issues

1. **Tests Time Out**
   - Increase timeout in vitest.performance.config.js
   - Check for infinite loops or blocking operations
   - Verify test data setup is correct

2. **Memory Leaks Detected**
   - Check for unclosed database connections
   - Verify proper cleanup in test teardown
   - Look for circular references in test data

3. **Inconsistent Results**
   - Ensure test isolation between runs
   - Check for external dependencies affecting performance
   - Verify deterministic test data generation

4. **High Failure Rates**
   - Review test expectations and targets
   - Check system resources during test execution
   - Verify mock implementations are correct

### Debugging Performance Issues

1. **Enable Detailed Logging**
   ```bash
   DEBUG=performance* npm run test:performance:all
   ```

2. **Profile Memory Usage**
   ```bash
   node --inspect test/performance/performanceUtils.ts
   ```

3. **Analyze Database Queries**
   - Enable query logging in test setup
   - Review slow query patterns
   - Check for missing indexes

## Contributing

When adding new performance tests:

1. Follow existing test patterns and naming conventions
2. Include appropriate performance assertions
3. Add documentation for new test scenarios
4. Update this README with new test categories
5. Ensure tests are deterministic and repeatable

## Performance Test Results Archive

Performance test results are archived in `test-results/performance-*.json` with timestamps. Historical data can be used to:

- Track performance trends over time
- Identify performance regressions
- Establish performance baselines for different load levels
- Compare performance across different system configurations

For detailed analysis of performance trends, use the provided analysis scripts or integrate with your monitoring platform.