"use client";

import React, { useState, createContext, useContext, useMemo, useCallback, useRef, useEffect } from 'react';
import { Bell, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';

// --- Context Definition ---
interface Notification {
    id: string;
    title: string; // Main short message for quick display/flashing
    details?: string; // Optional longer description
    type: 'error' | 'warning' | 'info';
    timestamp: Date;
    read: boolean;
    // relatedElementId?: string; // Keep if needed
}

interface NotificationsContextType {
    notifications: Notification[];
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void; // Added
    clearAll: () => void;
    unreadCount: number;
    latestUnreadTitle: string | null; // Added for flashing
    showFlash: boolean; // Added for flashing
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

// --- Provider Component ---
export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [latestUnreadTitle, setLatestUnreadTitle] = useState<string | null>(null);
    const [showFlash, setShowFlash] = useState<boolean>(false);
    const flashTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
        // --- Prevent duplicate validation errors ---
        const mostRecent = notifications[0];
        if (
            mostRecent &&
            mostRecent.type === 'error' && // Only prevent duplicate errors for now
            mostRecent.title === notification.title &&
            mostRecent.details === notification.details &&
            mostRecent.type === notification.type
            // Note: We don't compare timestamps or read status
        ) {
            console.log("Skipping duplicate notification:", notification.title);
            return; // Don't add the duplicate
        }
        // --- End duplicate check ---

        const newNotification: Notification = {
            id: crypto.randomUUID(),
            timestamp: new Date(),
            read: false,
            ...notification, // Spread the rest (title, details?, type)
        };
        setNotifications(prev => [newNotification, ...prev]);
        setLatestUnreadTitle(newNotification.title);
        setShowFlash(true);

        if (flashTimeoutRef.current) {
            clearTimeout(flashTimeoutRef.current);
        }
        flashTimeoutRef.current = setTimeout(() => {
            setShowFlash(false);
            setLatestUnreadTitle(null);
        }, 3000); // Flash for 3 seconds

    }, [notifications]); // Add notifications to dependency array for duplicate check

    const markAsRead = useCallback((id: string) => {
        setNotifications(prev =>
            prev.map(n => (n.id === id ? { ...n, read: true } : n))
        );
    }, []);

    // New function to mark all as read
    const markAllAsRead = useCallback(() => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }, []);

    const clearAll = useCallback(() => {
        setNotifications([]);
        setLatestUnreadTitle(null);
        setShowFlash(false);
        if (flashTimeoutRef.current) {
            clearTimeout(flashTimeoutRef.current);
        }
    }, []);

    const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

    // Clean up timeout on unmount
    useEffect(() => {
        return () => {
            if (flashTimeoutRef.current) {
                clearTimeout(flashTimeoutRef.current);
            }
        };
    }, []);

    const value = useMemo(() => ({
        notifications,
        addNotification,
        markAsRead,
        markAllAsRead, // Expose new function
        clearAll,
        unreadCount,
        latestUnreadTitle, // Expose flash state
        showFlash, // Expose flash state
    }), [notifications, addNotification, markAsRead, markAllAsRead, clearAll, unreadCount, latestUnreadTitle, showFlash]);

    return (
        <NotificationsContext.Provider value={value}>
            {children}
        </NotificationsContext.Provider>
    );
};

// --- Hook ---
export const useNotifications = () => {
    const context = useContext(NotificationsContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationsProvider');
    }
    return context;
};


// --- NotificationsPanel Component ---
interface NotificationsPanelProps {
    className?: string;
}

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ className }) => {
    const [isOpen, setIsOpen] = useState(false);
    // Get state from hook, including showFlash
    const { notifications, markAllAsRead, clearAll, unreadCount, showFlash } = useNotifications();

    // Effect to mark notifications as read when panel opens
     useEffect(() => {
        if (isOpen && unreadCount > 0) { // Only run if open and there are unread notifications
            // Add a small delay to allow the panel to open visually first
            const timer = setTimeout(() => {
                markAllAsRead();
            }, 500); // Slightly longer delay might be needed
            return () => clearTimeout(timer);
        }
    }, [isOpen, markAllAsRead, unreadCount]); // Add unreadCount to dependency array

    const togglePanel = () => {
       setIsOpen(!isOpen);
    };

    const panelVariants = {
        closed: { opacity: 0, y: -20, height: 0, scaleY: 0.8 },
        open: { opacity: 1, y: 0, height: 'auto', scaleY: 1 },
    };

    return (
        <TooltipPrimitive.Provider delayDuration={100}>
            <div className={cn("fixed top-4 right-4 z-50", className)}>
                {/* Toggle Button */}
                 <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="outline"
                            size="icon"
                            className={cn(
                                "rounded-full shadow-lg relative h-10 w-10",
                                // --- Add flashing animation class ---
                                showFlash && !isOpen && "animate-flash"
                                // --- End flashing animation ---
                            )}
                            onClick={togglePanel}
                            aria-label={isOpen ? "Close Notifications" : "Open Notifications"}
                        >
                             <Bell className="h-5 w-5" />
                             {unreadCount > 0 && (
                                <Badge
                                    variant="destructive"
                                    className={cn(
                                        "absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full transition-opacity",
                                        isOpen ? "opacity-0" : "opacity-100" // Hide badge when open
                                        )}
                                >
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </Badge>
                             )}
                        </Button>
                    </TooltipTrigger>
                     <TooltipContent side="bottom" align="end">
                        <p>{isOpen ? "Close Notifications" : showFlash ? "New Notification!" : "Open Notifications"}</p>
                    </TooltipContent>
                </Tooltip>

                {/* Panel Content */}
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            key="notifications-panel-content"
                            initial="closed"
                            animate="open"
                            exit="closed"
                            variants={panelVariants}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            className="absolute top-full right-0 mt-2 w-80 origin-top-right"
                        >
                            <div className="bg-card border border-border rounded-lg shadow-xl overflow-hidden">
                                <div className="flex items-center justify-between p-3 border-b">
                                    <h3 className="text-lg font-semibold">Notifications</h3>
                                    <div className="flex items-center space-x-2">
                                          {notifications.length > 0 && (
                                              <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs text-muted-foreground">
                                                  Clear All
                                              </Button>
                                          )}
                                         <Button variant="ghost" size="icon" onClick={togglePanel} className="h-7 w-7">
                                                <X className="h-4 w-4" />
                                         </Button>
                                    </div>
                                </div>
                                <ScrollArea className="h-[400px] max-h-[60vh]">
                                    <div className="p-3 space-y-3">
                                        {notifications.length === 0 ? (
                                            <p className="text-sm text-muted-foreground text-center py-4">No new notifications.</p>
                                        ) : (
                                            notifications.map((n) => (
                                                // Pass notification only, remove onRead prop
                                                <NotificationItem key={n.id} notification={n} />
                                            ))
                                        )}
                                    </div>
                                </ScrollArea>
                             </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </TooltipPrimitive.Provider>
    );
};

// --- NotificationItem Component ---
interface NotificationItemProps {
    notification: Notification;
    // onRead prop removed
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification }) => {
    // Destructure updated fields including details
    const { id, title, details, type, timestamp, read } = notification;

    // handleMarkRead is removed as marking read happens on panel open

    const Icon = type === 'error' ? AlertCircle : type === 'warning' ? AlertCircle : AlertCircle;
    const iconColor = type === 'error' ? 'text-destructive' : type === 'warning' ? 'text-yellow-500' : 'text-blue-500';

    const timeAgo = useMemo(() => {
        const seconds = Math.floor((new Date().getTime() - timestamp.getTime()) / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    }, [timestamp]);


    return (
        <div
            className={cn(
                "p-3 rounded-md border flex items-start space-x-3 relative transition-colors duration-200",
                !read ? "bg-card hover:bg-muted/50" : "bg-muted/30 text-muted-foreground",
                // Remove cursor-pointer as click doesn't mark read
            )}
            // Remove onClick
        >
             {!read && (
                <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" aria-label="Unread"></div>
            )}
            <Icon className={cn("h-5 w-5 mt-0.5 flex-shrink-0", iconColor)} />
             <div className="flex-grow space-y-1">
                 <p className={cn("font-semibold text-sm", !read ? "text-card-foreground" : "")}>{title}</p>
                 {/* Display details if they exist */}
                 {details && <p className={cn("text-xs", !read ? "text-muted-foreground" : "")}>{details}</p>}
                 <p className="text-xs text-muted-foreground/70">{timeAgo}</p>
            </div>
            {/* Removed the ... button for now, details are shown directly */}
        </div>
    );
};
