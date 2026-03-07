"use client";

import { cn } from "@/lib/utils";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";

export interface Character {
  id?: string | number;
  emoji: string;
  name: string;
  online: boolean;
  backgroundColor?: string;
  gradientFrom?: string;
  gradientTo?: string;
  gradientColors?: string;
  avatar?: string;
}

export interface MessageDockProps {
  characters?: Character[];
  onMessageSend?: (message: string, character: Character, characterIndex: number) => void;
  onCharacterSelect?: (character: Character, characterIndex: number) => void;
  onDockToggle?: (isExpanded: boolean) => void;
  className?: string;
  expandedWidth?: number;
  position?: "bottom" | "top";
  showSparkleButton?: boolean;
  showMenuButton?: boolean;
  enableAnimations?: boolean;
  animationDuration?: number;
  placeholder?: (characterName: string) => string;
  theme?: "light" | "dark" | "auto";
  autoFocus?: boolean;
  closeOnClickOutside?: boolean;
  closeOnEscape?: boolean;
  closeOnSend?: boolean;
}

const defaultCharacters: Character[] = [
  { emoji: "✨", name: "Sparkle", online: false },
  {
    emoji: "🧙‍♂️",
    name: "Wizard",
    online: true,
    backgroundColor: "bg-green-300",
    gradientFrom: "from-green-300",
    gradientTo: "to-green-100",
    gradientColors: "#86efac, #dcfce7",
  },
  {
    emoji: "🦄",
    name: "Unicorn",
    online: true,
    backgroundColor: "bg-purple-300",
    gradientFrom: "from-purple-300",
    gradientTo: "to-purple-100",
    gradientColors: "#c084fc, #f3e8ff",
  },
  {
    emoji: "🐵",
    name: "Monkey",
    online: true,
    backgroundColor: "bg-yellow-300",
    gradientFrom: "from-yellow-300",
    gradientTo: "to-yellow-100",
    gradientColors: "#fde047, #fefce8",
  },
  {
    emoji: "🤖",
    name: "Robot",
    online: false,
    backgroundColor: "bg-red-300",
    gradientFrom: "from-red-300",
    gradientTo: "to-red-100",
    gradientColors: "#fca5a5, #fef2f2",
  },
];

const getGradientColors = (character: Character) => {
  return character.gradientColors || "#86efac, #dcfce7";
};

export function MessageDock({
  characters = defaultCharacters,
  onMessageSend,
  onCharacterSelect,
  onDockToggle,
  className,
  expandedWidth = 448,
  position = "bottom",
  showSparkleButton = true,
  showMenuButton = true,
  enableAnimations = true,
  animationDuration = 1,
  placeholder = (name: string) => `Message ${name}...`,
  theme = "light",
  autoFocus = true,
  closeOnClickOutside = true,
  closeOnEscape = true,
  closeOnSend = true,
}: MessageDockProps) {
  const shouldReduceMotion = useReducedMotion();
  const [expandedCharacter, setExpandedCharacter] = useState<number | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const dockRef = useRef<HTMLDivElement>(null);
  const [collapsedWidth, setCollapsedWidth] = useState(266);
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (dockRef.current && !hasInitialized) {
      const width = dockRef.current.offsetWidth;
      if (width > 0) {
        setCollapsedWidth(width);
        setHasInitialized(true);
      }
    }
  }, [hasInitialized]);

  useEffect(() => {
    if (!closeOnClickOutside) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (dockRef.current && !dockRef.current.contains(event.target as Node)) {
        setExpandedCharacter(null);
        setMessageInput("");
        onDockToggle?.(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [closeOnClickOutside, onDockToggle]);

  const containerVariants = {
    hidden: { opacity: 0, y: 100, scale: 0.8 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 30,
        mass: 0.8,
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const hoverAnimation = shouldReduceMotion
    ? { scale: 1.02 }
    : {
        scale: 1.05,
        y: -8,
        transition: { type: "spring" as const, stiffness: 400, damping: 25 },
      };

  const handleCharacterClick = (index: number) => {
    const character = characters[index];
    if (expandedCharacter === index) {
      setExpandedCharacter(null);
      setMessageInput("");
      onDockToggle?.(false);
    } else {
      setExpandedCharacter(index);
      onCharacterSelect?.(character, index);
      onDockToggle?.(true);
    }
  };

  const handleSendMessage = () => {
    if (messageInput.trim() && expandedCharacter !== null) {
      const character = characters[expandedCharacter];
      onMessageSend?.(messageInput, character, expandedCharacter);
      setMessageInput("");
      if (closeOnSend) {
        setExpandedCharacter(null);
        onDockToggle?.(false);
      }
    }
  };

  const selectedCharacter = expandedCharacter !== null ? characters[expandedCharacter] : null;
  const isExpanded = expandedCharacter !== null;

  const positionClasses = position === "top"
    ? "fixed top-6 left-1/2 -translate-x-1/2 z-50"
    : "fixed bottom-6 left-1/2 -translate-x-1/2 z-50";

  return (
    <div className={cn(positionClasses, className)}>
      <motion.div
        ref={dockRef}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{
          width: isExpanded ? expandedWidth : "auto",
          background: isExpanded && selectedCharacter
            ? `linear-gradient(135deg, ${getGradientColors(selectedCharacter)})`
            : undefined,
        }}
        className={cn(
          "flex items-center gap-1 rounded-2xl px-2 py-2 shadow-lg border border-border/50 transition-colors duration-300",
          !isExpanded && "bg-card"
        )}
      >
        {/* Sparkle button */}
        {showSparkleButton && (
          <motion.button
            animate={{ 
              width: isExpanded ? 0 : "auto",
              opacity: isExpanded ? 0 : 1,
              marginRight: isExpanded ? 0 : 4,
            }}
            className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-lg overflow-hidden shrink-0"
            aria-label="Sparkle"
          >
            ✨
          </motion.button>
        )}

        {/* Separator */}
        <motion.div
          animate={{ width: isExpanded ? 0 : 1, opacity: isExpanded ? 0 : 0.3 }}
          className="h-6 bg-border shrink-0"
        />

        {/* Character buttons */}
        {characters.slice(1, -1).map((character, index) => {
          const actualIndex = index + 1;
          const isSelected = expandedCharacter === actualIndex;
          return (
            <motion.div key={actualIndex} className="relative">
              <motion.button
                className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center text-lg relative shrink-0 transition-colors",
                  isSelected ? "bg-white/50 shadow-sm" : "hover:bg-muted"
                )}
                onClick={() => handleCharacterClick(actualIndex)}
                whileHover={!isExpanded ? hoverAnimation : { scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label={`Message ${character.name}`}
              >
                {character.emoji}
                {character.online && (
                  <span className="absolute top-0.5 right-0.5 h-2.5 w-2.5 rounded-full bg-success border-2 border-card" />
                )}
              </motion.button>
            </motion.div>
          );
        })}

        {/* Text input */}
        <AnimatePresence>
          {isExpanded && (
            <motion.input
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSendMessage();
                if (e.key === "Escape" && closeOnEscape) {
                  setExpandedCharacter(null);
                  setMessageInput("");
                  onDockToggle?.(false);
                }
              }}
              placeholder={placeholder(selectedCharacter?.name || "")}
              className={cn(
                "w-[300px] absolute left-14 right-0 bg-transparent border-none outline-none text-sm font-medium z-50",
                theme === "dark"
                  ? "text-gray-100 placeholder-gray-400"
                  : "text-gray-700 placeholder-gray-600"
              )}
              autoFocus={autoFocus}
              initial={{ opacity: 0, x: 20 }}
              animate={{
                opacity: 1,
                x: 0,
                transition: { delay: 0.2, type: "spring", stiffness: 400, damping: 30 },
              }}
              exit={{ opacity: 0, transition: { duration: 0.1, ease: "easeOut" } }}
            />
          )}
        </AnimatePresence>

        {/* Separator */}
        <motion.div
          animate={{ width: isExpanded ? 0 : 1, opacity: isExpanded ? 0 : 0.3 }}
          className="h-6 bg-border shrink-0"
        />

        {/* Menu / Send button */}
        {showMenuButton && (
          <AnimatePresence mode="wait">
            {!isExpanded ? (
              <motion.button
                key="menu"
                className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-muted-foreground">
                  <rect x="2" y="3" width="12" height="1.5" rx="0.75" fill="currentColor" />
                  <rect x="2" y="7.25" width="12" height="1.5" rx="0.75" fill="currentColor" />
                  <rect x="2" y="11.5" width="12" height="1.5" rx="0.75" fill="currentColor" />
                </svg>
              </motion.button>
            ) : (
              <motion.button
                key="send"
                className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0"
                onClick={handleSendMessage}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
                whileTap={{ scale: 0.9 }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-primary">
                  <path d="M2 14L14.5 8L2 2V6.5L10 8L2 9.5V14Z" fill="currentColor" />
                </svg>
              </motion.button>
            )}
          </AnimatePresence>
        )}
      </motion.div>
    </div>
  );
}
