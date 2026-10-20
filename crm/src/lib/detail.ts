import { leadEvents } from "./events";
import { getLead, listActivities } from "./leads";

/** Tudo o que a ficha do lead mostra: o lead, a linha do tempo e os compromissos. */
export function leadDetail(id: number) {
  const lead = getLead(id);
  return lead ? { lead, activities: listActivities(id), events: leadEvents(id) } : null;
}
