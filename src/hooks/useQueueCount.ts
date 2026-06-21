import { useEffect, useState } from "react";
import { subscribeQueue } from "@/lib/offline/queue";

export function useQueueCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const unsub = subscribeQueue(setCount);
    return () => { unsub; };
  }, []);
  return count;
}
