
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelRightClose, X, LayoutDashboard, Settings, LucideIcon } from 'lucide-react';
import * as TooltipPrimitive from "@radix-ui/react-tooltip"; // Import primitive directly

import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    // TooltipProvider, // Remove this import
    TooltipTrigger,
} from '@/components/ui/tooltip'; // Keep other Tooltip components
import { cn } from '@/lib/utils';

interface FloatingToolbarProps {
    className?: string;
}

interface ToolbarButtonProps {
    label: string;
    icon: LucideIcon;
    onClick: () => void;
    isActive?: boolean;
}

// ToolbarButton remains the same, using the Tooltip component which internally uses Radix
const ToolbarButton: React.FC<ToolbarButtonProps> = ({ label, icon: Icon, onClick, isActive }) => (
    <Tooltip>
        <TooltipTrigger asChild>
            <Button
                variant={isActive ? "secondary" : "ghost"}
                size="icon"
                className="h-10 w-10 rounded-lg"
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

    const toggleToolbar = () => setIsOpen(!isOpen);

    const handleNavigate = (path: string) => {
        router.push(path);
    };

    const toolbarVariants = {
        closed: { width: '3.5rem', opacity: 0.8 },
        open: { width: '3.5rem', opacity: 1 },
    };


    return (
        // Use the primitive provider directly
        <TooltipPrimitive.Provider delayDuration={100}>
            <motion.div
                initial="closed"
                animate={isOpen ? "open" : "closed"}
                variants={toolbarVariants}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className={cn(
                    "fixed top-4 left-4 z-50",
                    "bg-card border border-border rounded-xl shadow-lg",
                    "flex flex-col items-center p-2 space-y-2",
                    className
                )}
            >
                 {/* Combined Open/Close Button */}
                 <motion.div
                    key="toggle-button"
                    className="relative h-10 w-10"
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
                                {/* Tooltip component uses the provider implicitly */}
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
                                     icon={X}
                                     onClick={toggleToolbar}
                                 />
                             </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Toolbar Content */}
                 <AnimatePresence>
                     {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2, delay: 0.1 }}
                            className="flex flex-col items-center space-y-2 pt-2 border-t border-border mt-2"
                        >
                             <ToolbarButton
                                 label="Dashboard"
                                 icon={LayoutDashboard}
                                 onClick={() => handleNavigate('/')}
                             />
                             <ToolbarButton
                                 label="Settings"
                                 icon={Settings}
                                 onClick={() => handleNavigate('/settings')}
                             />
                        </motion.div>
                     )}
                 </AnimatePresence>
            </motion.div>
        </TooltipPrimitive.Provider> // Close primitive provider
    );
};
