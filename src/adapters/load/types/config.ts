import { Options, Scenario } from "k6-node";

export type LoadAdapterConfig = {
  scenario: Omit<Scenario, 'name'> | Scenario[];
  options: Options;
}