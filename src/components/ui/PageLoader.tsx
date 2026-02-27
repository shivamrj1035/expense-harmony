"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Wallet } from "lucide-react";
import { useLoading } from "@/components/providers/LoadingProvider";

export function PageLoader() {
    const { isLoading, loadingText } = useLoading();

    return (
        <AnimatePresence>
            {isLoading && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#050505] p-6"
                >
                    {/* Animated Background Mesh Overlay */}
                    <div className="absolute inset-0 mesh-gradient opacity-30" />

                    <motion.div
                        initial={{ scale: 0.8, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 1.1, opacity: 0, y: -20 }}
                        transition={{
                            type: "spring",
                            damping: 20,
                            stiffness: 100,
                            delay: 0.1
                        }}
                        className="relative z-10 flex flex-col items-center gap-8"
                    >
                        {/* Animated Logo */}
                        <motion.div
                            animate={{
                                rotateY: [0, 360],
                                filter: ["drop-shadow(0 0 0px #7c3aed)", "drop-shadow(0 0 20px #7c3aed)", "drop-shadow(0 0 0px #7c3aed)"]
                            }}
                            transition={{
                                duration: 3,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                            className="h-20 w-20 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-2xl"
                        >
                            <Wallet className="h-10 w-10 text-white" />
                        </motion.div>

                        {/* Section Name Animation */}
                        <div className="flex flex-col items-center gap-2">
                            <motion.span
                                initial={{ letterSpacing: "1em", opacity: 0 }}
                                animate={{ letterSpacing: "0.2em", opacity: 1 }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                                className="text-4xl md:text-6xl font-black text-white tracking-widest text-gradient px-4 text-center"
                            >
                                {(loadingText || "LOADING").toUpperCase()}
                            </motion.span>

                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: "100%" }}
                                transition={{ duration: 1, ease: "easeInOut" }}
                                className="h-1 bg-gradient-primary rounded-full"
                            />
                        </div>

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.6 }}
                            transition={{ delay: 0.5 }}
                            className="text-sm text-white/60 font-medium uppercase tracking-[0.3em]"
                        >
                            Optimizing your experience
                        </motion.p>
                    </motion.div>

                    {/* Decorative Glows */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
                </motion.div>
            )}
        </AnimatePresence>
    );
}
