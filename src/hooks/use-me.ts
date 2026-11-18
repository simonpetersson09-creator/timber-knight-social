import { useCallback, useEffect, useState } from "react";
import { loadMe, type Me } from "@/lib/identity";
export function useMe() {
  const [me, setMe] = useState<Me | null>(null);
  const [failed, setFailed] = useState(false);
  const reload = useCallback((fresh = false) => { loadMe(fresh).then(setMe).catch(() => setFailed(true)); }, []);
  useEffect(() => reload(), [reload]);
  return { me, failed, reload };
}
