import { useEffect } from "react";
import Pusher from "pusher-js";

interface PusherHandlers {
  onMakeUpdate: (data: any) => void;
  onPrefixUpdate: (data: any) => void;
  onSuffixUpdate: (data: any) => void;
}

interface UsePusherProps {
  channelName: string;
  eventName: string;
  handlers: PusherHandlers;
}

export const usePusher = ({ channelName, eventName, handlers }: UsePusherProps) => {
  useEffect(() => {
    // Initialize Pusher client
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_APP_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      authEndpoint: "/api/pusher/auth", // Optional: for private channels
    });

    // Subscribe to the channel
    const channel = pusher.subscribe(channelName);

    // Bind event handlers
    channel.bind(eventName, (data: any) => {
      if (data.type === "make") {
        handlers.onMakeUpdate(data.data);
      } else if (data.type === "prefix") {
        handlers.onPrefixUpdate(data.data);
      } else if (data.type === "suffix") {
        handlers.onSuffixUpdate(data.data);
      }
    });

    // Cleanup on unmount
    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      pusher.disconnect();
    };
  }, [channelName, eventName, handlers]);
};