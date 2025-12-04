import { K6TestBuilder, Scenario } from 'k6-node';
import { readFile, unlink, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { Adapter } from '../../types/adapter';
import { LoadAdapterConfig } from './types/config';
import {
  K6Metric,
  K6Output,
  LoadAdapterReport,
  MetricReport,
} from './types/report';
import { K6OutputSanitizer } from './sanitizer';
import { deepMerge } from '../../utils/merge';
import { randomUUID } from 'node:crypto';

/**
 * Load adapter uses k6 engine for load-tests
 */
export class LoadAdapter
  implements Adapter<LoadAdapterConfig, LoadAdapterReport>
{
  async run(input: LoadAdapterConfig): Promise<LoadAdapterReport> {
    if (!input) {
      throw new Error('LoadAdapterConfig input is required');
    }

    const outputPath = path.join(
      process.cwd(),
      'stressor_load_' + randomUUID() + '.log'
    );
    const config = deepMerge({ options: { vus: 5, iterations: 10 } }, input);
    this.validateConfig(config);

    try {
      const builder = new K6TestBuilder();

      if (!builder)
        throw new Error('Failed to initialize K6TestBuilder');
      

      builder.setOptions(config.options);

      const scenarios = Array.isArray(config.scenario)
        ? config.scenario
        : [config.scenario];

      if (!scenarios || scenarios.length === 0)
        throw new Error('At least one scenario must be defined');
      
      //add the each scenary
      for (const [index, scenario] of scenarios.entries()) {
        if (!scenario || typeof scenario !== 'object') {
          throw new Error(`Scenario at index ${index} is invalid`);
        }

        const scenarioName = (scenario as Scenario).name || `scenario_${index}`;
        builder.addScenario({ name: scenarioName, ...scenario });
      }
      
      // k6 export a list of json
      await builder.run({ output: 'json=' + outputPath, stdio: 'ignore' });
      await this.validateOutputFile(outputPath);
      const fileContent = await readFile(outputPath, 'utf-8');

      if (!fileContent.trim()) {
        throw new Error('K6 output file is empty');
      }

      let adapterOutput: K6Output[];
      try {
        adapterOutput = fileContent
          .trim()
          .split('\n')
          .filter((line) => line.trim()) // Filtrar líneas vacías
          .map((json, index) => {
            try {
              return JSON.parse(json) as K6Output;
            } catch (e) {
              if (e instanceof Error) throw new Error(
                `Failed to parse JSON at line ${index + 1}: ${
                  e.message
                }`
              );
              throw e;
            }
          });
      } catch (e) {
        if (e instanceof Error)
          throw new Error(`Failed to parse K6 output: ${e.message}`);
        throw e
      }

      if (!adapterOutput || adapterOutput.length === 0) {
        throw new Error('No valid K6 output data was generated');
      }

      const sanitizer = new K6OutputSanitizer(adapterOutput);

      if (!sanitizer || typeof sanitizer.getSanitizedOutput !== 'function') {
        throw new Error('K6OutputSanitizer is not properly initialized');
      }

      const sanitizedOutput = sanitizer.getSanitizedOutput();

      if (!sanitizedOutput) {
        throw new Error('Sanitized output is empty');
      }

      return sanitizedOutput;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';

      console.error(`LoadAdapter failed: ${errorMessage}`);
      throw new Error(`Load test execution failed: ${errorMessage}`);
    } finally {
      await this.cleanupOutputFile(outputPath);
    }
  }

  /**
   * 
   */
  private validateConfig(config: LoadAdapterConfig): void {
    if (!config.options) {
      throw new Error('Configuration options are required');
    }

    const { vus, iterations } = config.options;

    if (vus === undefined || vus < 1) {
      throw new Error('vus must be a positive number');
    }

    if (
      iterations === undefined || iterations < 1
    ) {
      throw new Error('iterations must be a positive number');
    }

    if (config.scenario) {
      const scenarios = Array.isArray(config.scenario)
        ? config.scenario
        : [config.scenario];

      for (const [index, scenario] of scenarios.entries()) {
        if (!scenario || typeof scenario !== 'object') {
          throw new Error(`Scenario at index ${index} must be an object`);
        }
      }
    }
  }

  /**
   * 
   */
  private async validateOutputFile(filePath: string): Promise<void> {
    try {
      await access(filePath);
      const stats = await import('node:fs/promises').then((fs) =>
        fs.stat(filePath)
      );

      if (stats.size === 0) {
        throw new Error('Output file exists but is empty');
      }
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      throw new Error(`Failed to access output file: ${error.message}`);
    }
  }

  /**
   * 
   */
  private async cleanupOutputFile(filePath: string): Promise<void> {
    try {
      await access(filePath);
      await unlink(filePath);
    } catch (error) {

    }
  }
}