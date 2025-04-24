
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation'; // Use next/navigation for App Router
import { motion, AnimatePresence } from 'framer-motion';
import { PanelLeftOpen, PanelRightClose, X, LayoutDashboard, Settings, LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface FloatingToolbarProps {
    className?: string;
}

interface ToolbarButtonProps {
    label: string;
    icon: LucideIcon;
    onClick: () => void;
    isActive?: boolean; // Optional: to highlight the current page button
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ label, icon: Icon, onClick, isActive }) => (
    <Tooltip>
        <TooltipTrigger asChild>
            <Button
                variant={isActive ? "secondary" : "ghost"} // Highlight active button
                size="icon"
                className="h-10 w-10 rounded-lg" // Consistent sizing
                onClick={onClick}
                aria-label={label}
            >
                <Icon className="h-5 w-5" />
            </Button>
        </TooltipTrigger>
        <TooltipContent side="right" align="center">
            <p>{label}</p>
        </TooltipContent>
    </Tooltip>
);


export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({ className }) => {
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();
    // const pathname = usePathname(); // Get current path for active state (optional for now)

    const toggleToolbar = () => setIsOpen(!isOpen);

    const handleNavigate = (path: string) => {
        router.push(path);
        // Optionally close toolbar on navigation, or keep it open as requested
        // setIsOpen(false);
    };

    const iconVariants = {
        closed: { rotate: 0, scale: 1 },
        open: { rotate: 180, scale: 1 },
    };

    const toolbarVariants = {
        closed: { width: '3.5rem', opacity: 0.8 }, // Width of the single button + padding
        open: { width: '3.5rem', opacity: 1 }, // Keep width consistent, expand vertically
    };


    return (
        <TooltipProvider delayDuration={100}>
            <motion.div
                initial="closed"
                animate={isOpen ? "open" : "closed"}
                variants={toolbarVariants}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className={cn(
                    "fixed top-1/2 left-2 transform -translate-y-1/2 z-50", // Position fixed, centered vertically
                    "bg-card border border-border rounded-xl shadow-lg",
                    "flex flex-col items-center p-2 space-y-2", // Vertical layout
                    className
                )}
                // Add drag controls here later if needed
                // drag
                // dragConstraints={{ left: 0, right: typeof window !== 'undefined' ? window.innerWidth - 80 : 0, top: 0, bottom: typeof window !== 'undefined' ? window.innerHeight - 200 : 0 }}
                // dragMomentum={false}
            >
                 {/* Combined Open/Close Button */}
                 <motion.div
                    key="toggle-button" // Key helps AnimatePresence differentiate
                    className="relative h-10 w-10" // Container to overlay buttons
                 >
                    <AnimatePresence initial={false}>
                        {!isOpen && (
                            <motion.div
                                key="open"
                                initial={{ opacity: 0, scale: 0.5, rotate: -180 }}
                                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                exit={{ opacity: 0, scale: 0.5, rotate: -180 }}
                                transition={{ duration: 0.2 }}
                                className="absolute inset-0"
                            >
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-10 w-10 rounded-lg"
                                            onClick={toggleToolbar}
                                            aria-label="Open Toolbar"
                                        >
                                            <PanelRightClose className="h-5 w-5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" align="center"><p>Open Toolbar</p></TooltipContent>
                                </Tooltip>
                             </motion.div>
                        )}
                        {isOpen && (
                            <motion.div
                                key="close"
                                initial={{ opacity: 0, scale: 0.5, rotate: 180 }}
                                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                exit={{ opacity: 0, scale: 0.5, rotate: 180 }}
                                transition={{ duration: 0.2 }}
                                className="absolute inset-0"
                            >
                                 <ToolbarButton
                                     label="Close Toolbar"
                                     icon={X} // Using X for close
                                     onClick={toggleToolbar}
                                 />
                             </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>


                {/* Toolbar Content - conditionally rendered */}
                 <AnimatePresence>
                     {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2, delay: 0.1 }} // Stagger animation slightly
                            className="flex flex-col items-center space-y-2 pt-2 border-t border-border mt-2" // Add separator and spacing
                        >
                             <ToolbarButton
                                 label="Dashboard"
                                 icon={LayoutDashboard}
                                 onClick={() => handleNavigate('/')}
                                // isActive={pathname === '/'} // Optional active state
                             />
                             <ToolbarButton
                                 label="Settings"
                                 icon={Settings}
                                 onClick={() => handleNavigate('/settings')}
                                // isActive={pathname === '/settings'} // Optional active state
                             />
                            {/* Add other buttons here as needed */}
                        </motion.div>
                     )}
                 </AnimatePresence>
            </motion.div>
        </TooltipProvider>
    );
};
