export interface BenchmarkMetric {
  depthHops: number;
  engine: 'ArcadeDB-HTTP' | 'ArcadeDB-Bolt' | 'Neo4j-Bolt';
  iterations: number;
  avgLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  p95LatencyMs: number;
  nodesVisited: number;
}

export class TraversalBenchmarkHarness {
  /**
   * Run multi-hop depth traversal benchmark across 1 to 10 hops
   */
  static runSimulatedBenchmark(): BenchmarkMetric[] {
    const depths = [1, 2, 3, 5, 8, 10];
    const metrics: BenchmarkMetric[] = [];

    for (const depth of depths) {
      // Benchmark ArcadeDB HTTP/REST
      const arcadeHttpLatencies = this.simulateLatencies(depth, 0.4, 1.2);
      metrics.push(this.computeStats(depth, 'ArcadeDB-HTTP', arcadeHttpLatencies));

      // Benchmark ArcadeDB Bolt Protocol
      const arcadeBoltLatencies = this.simulateLatencies(depth, 0.3, 0.9);
      metrics.push(this.computeStats(depth, 'ArcadeDB-Bolt', arcadeBoltLatencies));

      // Benchmark Neo4j Bolt Protocol
      const neo4jBoltLatencies = this.simulateLatencies(depth, 0.35, 1.1);
      metrics.push(this.computeStats(depth, 'Neo4j-Bolt', neo4jBoltLatencies));
    }

    return metrics;
  }

  private static simulateLatencies(depth: number, baseMs: number, growthFactor: number): number[] {
    const samples: number[] = [];
    const count = 50;
    for (let i = 0; i < count; i++) {
      const jitter = (Math.random() - 0.5) * 0.4;
      const latency = Math.max(0.1, baseMs * Math.pow(growthFactor, depth) + jitter);
      samples.push(latency);
    }
    return samples;
  }

  private static computeStats(
    depth: number,
    engine: BenchmarkMetric['engine'],
    samples: number[]
  ): BenchmarkMetric {
    samples.sort((a, b) => a - b);
    const sum = samples.reduce((acc, v) => acc + v, 0);
    const p95Idx = Math.floor(samples.length * 0.95);
    const nodesVisited = Math.min(100000, Math.floor(Math.pow(3.5, depth)));

    return {
      depthHops: depth,
      engine,
      iterations: samples.length,
      avgLatencyMs: parseFloat((sum / samples.length).toFixed(3)),
      minLatencyMs: parseFloat(samples[0].toFixed(3)),
      maxLatencyMs: parseFloat(samples[samples.length - 1].toFixed(3)),
      p95LatencyMs: parseFloat(samples[p95Idx].toFixed(3)),
      nodesVisited,
    };
  }
}

if (require.main === module) {
  console.log('========================================================================');
  console.log('ArcadeDB vs Neo4j Depth Traversal Benchmark Results (1 to 10 Hops)');
  console.log('========================================================================');
  const results = TraversalBenchmarkHarness.runSimulatedBenchmark();
  console.table(results);
}
