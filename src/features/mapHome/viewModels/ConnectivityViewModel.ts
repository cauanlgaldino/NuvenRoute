import * as Network from 'expo-network';
import { useEffect, useState } from 'react';

type ConnectivityState = {
  isOnline: boolean;
  isChecking: boolean;
};

export function useConnectivityViewModel() {
  const [state, setState] = useState<ConnectivityState>({
    isOnline: false,
    isChecking: true,
  });

  useEffect(() => {
    let isMounted = true;

    async function checkConnectivity() {
      try {
        const networkState = await Network.getNetworkStateAsync();

        if (!isMounted) return;

        setState({
          isOnline: Boolean(networkState.isConnected && networkState.isInternetReachable !== false),
          isChecking: false,
        });
      } catch {
        if (!isMounted) return;

        setState({
          isOnline: false,
          isChecking: false,
        });
      }
    }

    void checkConnectivity();
    const intervalId = setInterval(checkConnectivity, 5000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  return state;
}
