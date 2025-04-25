'use client';

import React, { useState, createContext, useContext, useMemo, useCallback } from 'react';
import { Bell, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as TooltipPrimitive from "@radix-ui/react-tooltip"; // Import primitive directly

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
// import { Separator } from '@/components/ui/separator'; // Removed unused import
import { cn } from '@/lib/utils';
import {
    Tooltip,
    TooltipContent,
    // TooltipProvider, // Remove this import
    TooltipTrigger,
} from '@/components/ui/tooltip'; // Keep other Tooltip components

// --- Context Definition ---
interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'error' | 'warning' | 'info';
    timestamp: Date;
    read: boolean;
    relatedElementId?: string;
}

interface NotificationsContextType {
    notifications: Notification[];
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
    markAsRead: (id: string) => void;
    clearAll: () => void;
    unreadCount: number;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

// --- Provider Component ---
export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
        const newNotification: Notification = {
            ...notification,
            id: crypto.randomUUID(),
            timestamp: new Date(),
            read: false,
        };
        setNotifications(prev => [newNotification, ...prev]);
    }, []);

    const markAsRead = useCallback((id: string) => {
        setNotifications(prev =>
            prev.map(n => (n.id === id ? { ...n, read: true } : n))
        );
    }, []);

    const clearAll = useCallback(() => {
        setNotifications([]);
    }, []);

    const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

    const value = useMemo(() => ({
        notifications,
        addNotification,
        markAsRead,
        clearAll,
        unreadCount
    }), [notifications, addNotification, markAsRead, clearAll, unreadCount]);

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
    const { notifications, markAsRead, clearAll, unreadCount } = useNotifications();

    const togglePanel = () => setIsOpen(!isOpen);

    const panelVariants = {
        closed: { opacity: 0, y: -20, height: 0, scaleY: 0.8 },
        open: { opacity: 1, y: 0, height: 'auto', scaleY: 1 },
    };

    return (
        // Use the primitive provider directly
        <TooltipPrimitive.Provider delayDuration={100}>
            <div className={cn("fixed top-4 right-4 z-50", className)}>
                {/* Toggle Button */}
                 <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="outline"
                            size="icon"
                            className="rounded-full shadow-lg relative h-10 w-10"
                            onClick={togglePanel}
                            aria-label={isOpen ? "Close Notifications" : "Open Notifications"}
                        >
                             <Bell className="h-5 w-5" />
                             {unreadCount > 0 && !isOpen && (
                                <Badge
                                    variant="destructive"
                                    className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full"
                                >
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </Badge>
                             )}
                        </Button>
                    </TooltipTrigger>
                     <TooltipContent side="bottom" align="end">
                        <p>{isOpen ? "Close Notifications" : "Open Notifications"}</p>
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
                                                <NotificationItem key={n.id} notification={n} onRead={markAsRead} />
                                            ))
                                        )}
                                    </div>
                                </ScrollArea>
                             </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </TooltipPrimitive.Provider> // Close primitive provider
    );
};

// --- NotificationItem Component ---
interface NotificationItemProps {
    notification: Notification;
    onRead: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onRead }) => {
    const { id, title, message, type, timestamp, read } = notification;

    const handleMarkRead = () => {
        if (!read) {
            onRead(id);
        }
    };

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
                "cursor-pointer"
            )}
            onClick={handleMarkRead}
        >
             {!read && (
                <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" aria-label="Unread"></div>
            )}
            <Icon className={cn("h-5 w-5 mt-0.5 flex-shrink-0", iconColor)} />
             <div className="flex-grow space-y-1">
                 <p className={cn("font-semibold text-sm", !read ? "text-card-foreground" : "")}>{title}</p>
                 <p className={cn("text-xs", !read ? "text-muted-foreground" : "")}>{message}</p>
                 <p className="text-xs text-muted-foreground/70">{timeAgo}</p>
            </div>
        </div>
    );
};
