import { RingCreated } from "../generated/MinimalProxyHRFactory/MinimalProxyHRFactory";
import { HeartbeatRing as HeartbeatRingTemplate } from "../generated/templates";

export function handleRingCreated(event: RingCreated): void {
  HeartbeatRingTemplate.create(event.params.ring);
}
