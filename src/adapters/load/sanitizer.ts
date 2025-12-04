import { MetricReport, K6Output, K6Metric, K6Point } from './types/report';

export class K6OutputSanitizer {
  private metrics: Map<string, MetricReport> = new Map();
  private rawData: K6Output[];

  /**
   * processes the raw K6 output data.
   */
  constructor(rawOutput: K6Output[]) {
    this.rawData = rawOutput;
    this.processData();
  }

  /**
   * Processes raw K6 data by extracting metric definitions and data points.
   */
  private processData(): void {
    this.rawData.forEach((item) => {
      if (item.type === 'Metric') {
        this.addMetricDefinition(item);
      }
    });

    this.rawData.forEach((item) => {
      if (item.type === 'Point') {
        this.addDataPoint(item);
      }
    });

    this.calculateSummaries();
  }

  /**
   * Adds a metric definition from a K6Metric to the internal map.
   */
  private addMetricDefinition(metric: K6Metric): void {
    const unit = this.getUnitFromContains(metric.data.contains);

    if (!this.metrics.has(metric.data.name)) {
      this.metrics.set(metric.data.name, {
        name: metric.data.name,
        type: metric.data.type,
        description: this.getMetricDescription(metric.data.name),
        unit,
        points: [],
      });
    }
  }

  /**
   * Adds a data point from a K6Point to its corresponding metric.
   */
  private addDataPoint(point: K6Point): void {
    const metricName = point.metric;

    if (!this.metrics.has(metricName)) {
      // crear metrica si no existe (caso raro que suceda)
      this.metrics.set(metricName, {
        name: metricName,
        type: 'unknown',
        description: this.getMetricDescription(metricName),
        points: [],
      });
    }

    const metric = this.metrics.get(metricName)!;
    metric.points.push({
      time: point.data.time,
      timestamp: new Date(point.data.time),
      value: point.data.value,
      tags: point.data.tags,
    });
  }

  /**
   * Calculates summary statistics (avg, min, max, count) for each metric.
   */
  private calculateSummaries(): void {
    this.metrics.forEach((metric) => {
      if (metric.points.length > 0) {
        const values = metric.points.map((p) => p.value);
        metric.summary = {
          count: values.length,
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
        };
      }
    });
  }

  /**
   * Determines the unit of measurement based on the metric's 'contains' field.
   */
  private getUnitFromContains(contains: string): string | undefined {
    const units: Record<string, string> = {
      time: 'ms',
      data: 'bytes',
    };
    return units[contains];
  }

  /**
   * Returns a human-readable description for a given metric name.
   */
  private getMetricDescription(name: string): string {
    const descriptions: Record<string, string> = {
      vus: 'Virtual Users - Número de usuarios virtuales activos',
      vus_max:
        'Virtual Users Max - Máximo número de usuarios virtuales permitidos',
      http_reqs: 'HTTP Requests - Total de peticiones HTTP realizadas',
      http_req_duration:
        'HTTP Request Duration - Duración de las peticiones HTTP',
      http_req_blocked:
        'HTTP Request Blocked - Tiempo bloqueado en la petición',
      http_req_connecting: 'HTTP Request Connecting - Tiempo de conexión',
      http_req_tls_handshaking:
        'HTTP Request TLS Handshaking - Tiempo de handshake TLS',
      http_req_sending: 'HTTP Request Sending - Tiempo enviando datos',
      http_req_waiting: 'HTTP Request Waiting - Tiempo esperando respuesta',
      http_req_receiving: 'HTTP Request Receiving - Tiempo recibiendo datos',
      http_req_failed:
        'HTTP Requests Failed - Porcentaje de peticiones fallidas',
      checks: 'Checks - Verificaciones realizadas y su estado',
      data_sent: 'Data Sent - Bytes enviados',
      data_received: 'Data Received - Bytes recibidos',
      iteration_duration: 'Iteration Duration - Duración de cada iteración',
      iterations: 'Iterations - Total de iteraciones completadas',
    };

    return descriptions[name] || `Métrica: ${name}`;
  }

  /**
   * Returns all sanitized metrics as an array.
   */
  public getSanitizedOutput(): MetricReport[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Retrieves a specific sanitized metric by its name.
   */
  public getMetricByName(name: string): MetricReport | undefined {
    return this.metrics.get(name);
  }

  /**
   * Filters and returns sanitized metrics by their type.
   */
  public getMetricsByType(type: string): MetricReport[] {
    return Array.from(this.metrics.values()).filter(
      (metric) => metric.type === type
    );
  }

  /**
   * Returns a summary object containing key information for all metrics.
   */
  public getSummary() {
    const summary: {
      [metricName: string]: Omit<MetricReport, 'name' | 'points'> & {
        dataPoints: number;
      };
    } = {};

    this.metrics.forEach((metric) => {
      summary[metric.name] = {
        type: metric.type,
        description: metric.description,
        unit: metric.unit,
        dataPoints: metric.points.length,
        summary: metric.summary,
      };
    });

    return summary;
  }

  /**
   * Returns a formatted JSON string of all sanitized metrics.
   */
  public toFormattedJSON(): string {
    return JSON.stringify(this.getSanitizedOutput(), null, 2);
  }

  /**
   * Returns a minimal output object with summary, last value, and unit for each metric.
   */
  public toMinimalOutput() {
    const minimal: {
      [metricName: string]: {
        unit?: string;
        lastValue: number;
        summary: MetricReport['summary'];
      };
    } = {};

    this.metrics.forEach((metric) => {
      minimal[metric.name] = {
        summary: metric.summary,
        lastValue: metric.points[metric.points.length - 1]?.value,
        unit: metric.unit,
      };
    });

    return minimal;
  }
}
