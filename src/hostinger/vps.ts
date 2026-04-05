import { HostingerClient } from "./client.js";

export interface VirtualMachine {
  id: number;
  hostname: string;
  state: string;
  plan: string;
  ip_address: string;
  ipv4: { address: string; ptr: string }[];
  ipv6: { address: string }[];
  os: { name: string; version: string };
  datacenter: string;
  created_at: string;
}

export class VpsManager {
  private client: HostingerClient;

  constructor(client: HostingerClient) {
    this.client = client;
  }

  async list(): Promise<VirtualMachine[]> {
    return this.client.get<VirtualMachine[]>("/virtual-machines");
  }

  async get(id: number | string): Promise<VirtualMachine> {
    return this.client.get<VirtualMachine>(`/virtual-machines/${id}`);
  }

  async start(id: number | string): Promise<void> {
    await this.client.post(`/virtual-machines/${id}/start`);
  }

  async stop(id: number | string): Promise<void> {
    await this.client.post(`/virtual-machines/${id}/stop`);
  }

  async restart(id: number | string): Promise<void> {
    await this.client.post(`/virtual-machines/${id}/restart`);
  }

  getIpAddress(vm: VirtualMachine): string {
    if (vm.ip_address) return vm.ip_address;
    if (vm.ipv4?.length > 0) return vm.ipv4[0].address;
    throw new Error(`No IP address found for VPS ${vm.id}`);
  }

  printStatus(vm: VirtualMachine): void {
    const ip = this.getIpAddress(vm);
    console.log(`  ID:         ${vm.id}`);
    console.log(`  Hostname:   ${vm.hostname}`);
    console.log(`  State:      ${vm.state}`);
    console.log(`  IP:         ${ip}`);
    console.log(`  OS:         ${vm.os?.name || "N/A"} ${vm.os?.version || ""}`);
    console.log(`  Datacenter: ${vm.datacenter || "N/A"}`);
    console.log(`  Plan:       ${vm.plan || "N/A"}`);
  }
}
