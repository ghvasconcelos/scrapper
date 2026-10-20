import { leadEvents } from "./events";
import { getLead, listActivities } from "./leads";

/** Tudo o que a ficha do lead mostra: o lead, a linha do tempo e os compromissos. */
export async function leadDetail(id: number) {
  const lead = await getLead(id);
  if (!lead) return null;
  const [activities, events] = await Promise.all([listActivities(id), leadEvents(id)]);
  return { lead, activities, events };
}
