/**
 * Represents an asynchronous adapter that receives an Input (I)
 * and produces an Output (O).
 */
export interface Adapter<I, O> {
  run(input: I): Promise<O>;
}
