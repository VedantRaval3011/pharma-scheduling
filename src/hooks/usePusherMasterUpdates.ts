import { useEffect, useRef, useCallback } from 'react';
import Pusher from 'pusher-js';

interface PusherEventData {
  action: 'create' | 'update' | 'delete';
  type: 'make' | 'prefix' | 'suffix';
  data: {
    id: string;
    name: string;
    description?: string;
    oldName?: string;
    oldDescription?: string;
    createdBy?: string;
  };
  timestamp: string;
  companyId: string;
  locationId: string;
}

interface UsePusherMasterUpdatesProps {
  companyId: string;
  locationId: string;
  onMakeUpdate: (event: PusherEventData) => void;
  onPrefixUpdate: (event: PusherEventData) => void;
  onSuffixUpdate: (event: PusherEventData) => void;
}

export const usePusherMasterUpdates = ({
  companyId,
  locationId,
  onMakeUpdate,
  onPrefixUpdate,
  onSuffixUpdate,
}: UsePusherMasterUpdatesProps) => {
  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<any>(null);
  const isConnectedRef = useRef(false);

  // Memoize the event handler to prevent reconnections
  const handleMasterDataUpdate = useCallback((eventData: PusherEventData) => {
    console.log('🔄 Pusher event received:', {
      type: eventData.type,
      action: eventData.action,
      id: eventData.data.id,
      name: eventData.data.name,
      companyId: eventData.companyId,
      locationId: eventData.locationId,
      timestamp: eventData.timestamp
    });

    // Validate that the event is for the correct company/location
    if (eventData.companyId !== companyId || eventData.locationId !== locationId) {
      console.warn('⚠️ Event received for different company/location, ignoring');
      return;
    }

    // Route the event to the appropriate handler based on type
    try {
      switch (eventData.type) {
        case 'make':
          onMakeUpdate(eventData);
          console.log('✅ Make update handled');
          break;
        case 'prefix':
          onPrefixUpdate(eventData);
          console.log('✅ Prefix update handled');
          break;
        case 'suffix':
          onSuffixUpdate(eventData);
          console.log('✅ Suffix update handled');
          break;
        default:
          console.warn('❌ Unknown event type:', eventData.type);
      }
    } catch (error) {
      console.error('💥 Error handling Pusher event:', error);
    }
  }, [companyId, locationId, onMakeUpdate, onPrefixUpdate, onSuffixUpdate]);

  useEffect(() => {
    if (!companyId || !locationId) {
      console.log('⏳ Waiting for companyId and locationId...');
      return;
    }

    if (isConnectedRef.current) {
      console.log('🔄 Already connected to Pusher, skipping...');
      return;
    }

    console.log('🚀 Initializing Pusher connection...', { companyId, locationId });

    try {
      // Initialize Pusher client
      pusherRef.current = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        forceTLS: true,
      });

      // Subscribe to the specific channel for this company-location
      const channelName = `master-updates-${companyId}-${locationId}`;
      console.log('📡 Subscribing to channel:', channelName);
      
      channelRef.current = pusherRef.current.subscribe(channelName);
      
      // Handle connection events
      pusherRef.current.connection.bind('connected', () => {
        console.log('✅ Pusher connected successfully');
        isConnectedRef.current = true;
      });

      pusherRef.current.connection.bind('disconnected', () => {
        console.log('❌ Pusher disconnected');
        isConnectedRef.current = false;
      });

      pusherRef.current.connection.bind('error', (error: any) => {
        console.error('💥 Pusher connection error:', error);
      });

      // Handle subscription events
      channelRef.current.bind('pusher:subscription_succeeded', () => {
        console.log('✅ Successfully subscribed to channel:', channelName);
      });

      channelRef.current.bind('pusher:subscription_error', (error: any) => {
        console.error('💥 Subscription error:', error);
      });

      // Bind to master data update events
      channelRef.current.bind('master-data-update', handleMasterDataUpdate);

    } catch (error) {
      console.error('💥 Error initializing Pusher:', error);
    }

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up Pusher connection...');
      
      if (channelRef.current) {
        channelRef.current.unbind('master-data-update', handleMasterDataUpdate);
        channelRef.current.unbind_all();
        
        if (pusherRef.current) {
          const channelName = `master-updates-${companyId}-${locationId}`;
          pusherRef.current.unsubscribe(channelName);
          console.log('📡 Unsubscribed from channel:', channelName);
        }
      }
      
      if (pusherRef.current) {
        pusherRef.current.disconnect();
        console.log('❌ Pusher disconnected');
      }
      
      isConnectedRef.current = false;
    };
  }, [companyId, locationId, handleMasterDataUpdate]);

  return {
    pusher: pusherRef.current,
    channel: channelRef.current,
    isConnected: isConnectedRef.current,
  };
};