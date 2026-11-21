import { useCallback, useEffect, useRef, useState } from 'react';
import { historyError, localHistory, storeLocal, syncHistory } from './history';

export default function useCloudHistory() {
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState('Loading saved games…');
  const [busy, setBusy] = useState(false);
  const syncing = useRef(false);
  const refresh = useCallback(async () => {
    if (syncing.current) return;
    syncing.current = true; setBusy(true); setStatus('Syncing with cloud…');
    try { setHistory(await syncHistory()); setStatus('Cloud history is up to date'); }
    catch (error) { setStatus(historyError(error)); setHistory(await localHistory()); }
    finally { syncing.current = false; setBusy(false); }
  }, []);
  useEffect(() => { localHistory().then(setHistory); }, []);
  const save = useCallback(async (result) => {
    try { setHistory(await storeLocal({ ...result, synced: false })); await refresh(); }
    catch { setStatus('Could not save on this device. Please try again.'); }
  }, [refresh]);
  return { history, status, busy, refresh, save };
}
