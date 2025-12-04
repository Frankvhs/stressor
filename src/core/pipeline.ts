import { Pipe } from "stream";
import { Adapter } from "../types/adapter";
import { deepMerge } from "../utils/merge";

export interface PipelineOptions {
  runInParallel?: boolean;
  timeout?: number; // ms
  saveRaw?: boolean;
}

/**
 * A generic container that dynamically grows its internal types
 * each time a new adapter is added
 *
 * - `adapters` stores adapters keyed by name.
 * - `config` stores a configuration entry for each adapter,
 *    typed automatically with the adapter's Input type.
 */
export class AdapterPipeline<
	Adapters extends Record<string, Adapter<any, any>> = {},
	Config extends {
		[K in keyof Adapters]: Adapters[K] extends Adapter<infer I, any> ? I : never;
	} = {
		[K in keyof Adapters]: Adapters[K] extends Adapter<infer I, any> ? I : never;
	}
> {
	constructor(
		public readonly adapters: Adapters = {} as Adapters,
		public readonly config: Config = {} as Config
	) {}

	/**
	 * Adds a new adapter under the provided key and returns a new Stressor
	 * instance with expanded type information:
	 *
	 * - `adapters[key]` becomes the provided adapter.
	 * - `config[key]` becomes the adapter's Input type.
	 *
	 * @param key Unique identifier for the adapter.
	 * @param adapter The adapter instance to register.
	 * @param config Configuration for the adapter.
	 */
	addAdapter<K extends string, A extends Adapter<any, any>>(
		key: K,
		adapter: A,
		config?: A extends Adapter<infer I, any> ? I : never
	): AdapterPipeline<
		Adapters & { [P in K]: A },
		Config & { [P in K]: A extends Adapter<infer I, any> ? I : never }
	> {
		return new AdapterPipeline(
			{
				...this.adapters,
				[key]: adapter
			} as any,
			{
				...this.config,
				[key]: config || (undefined as any)
			} as any
		);
	}

  /**
   * Add config
   */
  setConfig<K extends keyof Config>(key: K, value: Config[K]): this {
    this.config[key] = value;
    return this;
  }

	/**
	 * Retrieves a previously registered adapter typed according to its key.
	 */
	getAdapter<K extends keyof Adapters>(key: K): Adapters[K] {
		return this.adapters[key];
	}

	/**
	 * Retrieves the input configuration type associated with the adapter at `key`.
	 */
	getConfig<K extends keyof Config>(key: K): Config[K] {
		return this.config[key];
	}

  /**
   * Runs containing all adapters previously registered.
   */
  async run(config?: Config, options: PipelineOptions = {}) {
    const finalConfig = deepMerge(this.config, config || {});

    const promises = Object.entries(this.adapters).map(([key, adapter]) =>
      finalConfig[key] ? adapter.run(finalConfig[key]) : null
    );
    
    const results = options.runInParallel ? await Promise.all(promises) : [];
    if (!options.runInParallel) for(const p of promises) {
      results.push(await p);
    }

    return Object.fromEntries(
      Object.entries(this.adapters).map(([key, _], index) => [key, results[index]])
    ) as { [K in keyof Adapters]: ReturnType<Adapters[K]['run']> | null };
  }

}
