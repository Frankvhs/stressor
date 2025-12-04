import { Adapter } from "../../types/adapter";

export type AuditAdapterConfig = {};
export type AuditAdapterReport = undefined;

export class AuditAdapter implements Adapter<null, {}> {
  // not implemented yet
  async run(){
    return {}
  }
}