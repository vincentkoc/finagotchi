"use client";

import { usePet } from "@/app/providers/PetProvider";
import { EvolutionId } from "@/constants/evolutions";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, forwardRef } from "react";

const pathToText = {
  play: "finagotchi",
  create: "recruitment desk",
  about: "about finagotchi",
  dossiers: "personnel records",
};

// Custom popup component
function ConfirmPopup({
  isOpen,
  onConfirm,
  onCancel,
  petName,
}: {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  petName: string;
}) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-zinc-500/20 bg-opacity-50 flex items-center justify-center z-50 text-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white border-2 border-black p-6 max-w-sm mx-4 text-center"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
        >
          <p className="text-zinc-700 mb-6">
            are you sure you want to retire {petName}? {petName} still has
            invoices to review... (;_;)
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={onCancel}
              className="px-4 py-2 border-2 border-black hover:bg-zinc-100"
            >
              cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-black text-white hover:bg-zinc-800"
            >
              retire
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function MenuContent({
  page,
  showConfirmPopup,
  isDark,
}: {
  page: "play" | "create" | "dossiers" | "about";
  showConfirmPopup: () => void;
  isDark: boolean;
}) {
  const { pet } = usePet();
  const hoverClass = isDark ? "hover:text-white" : "hover:text-zinc-800";

  if (page === "about" || page === "dossiers") {
    return (
      <>
        <AnimatePresence>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            {`${pathToText[page]}`}
          </motion.span>
        </AnimatePresence>
        <AnimatePresence>
          <motion.a
            href="/play"
            className={`${hoverClass} no-drag`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            back
          </motion.a>
        </AnimatePresence>
      </>
    );
  }

  if (!pet) {
    return null;
  }

  return (
    <>
      <AnimatePresence>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          {`${pathToText[page]}${page === "play" ? ` > ${pet.name}` : ""}`}
        </motion.span>
      </AnimatePresence>
      <AnimatePresence>
        {pet.name && (
          <motion.a
            onClick={() => {
              if (pet.evolutionIds.includes(EvolutionId.RIP) || pet.age >= 2) {
                window.location.href = "/create";
                return;
              }
              if (pet.age < 2) {
                showConfirmPopup();
              }
            }}
            className={`${hoverClass} no-drag`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            new pet
          </motion.a>
        )}
      </AnimatePresence>

      <AnimatePresence>
        <motion.a
          href="/dossiers"
          className={`${hoverClass} no-drag`}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          dossiers
        </motion.a>
      </AnimatePresence>

      <AnimatePresence>
        <motion.a
          href="/about"
          className={`${hoverClass} no-drag`}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
        >
          about
        </motion.a>
      </AnimatePresence>
    </>
  );
}

const MobileMenu = forwardRef<
  HTMLDivElement,
  {
    page: "play" | "create" | "dossiers" | "about";
    isOpen: boolean;
    onClose: () => void;
    showConfirmPopup: () => void;
  }
>(({ page, isOpen, onClose, showConfirmPopup }, ref) => {
  const { pet } = usePet();

  const menuItems = [];

  if (page === "about" || page === "dossiers") {
    menuItems.push(
      <motion.a
        key="back"
        href="/play"
        className="hover:text-zinc-800 no-drag block py-2"
        onClick={onClose}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
      >
        back
      </motion.a>
    );
  } else if (pet) {
    if (pet.name) {
      menuItems.push(
        <motion.a
          key="new-pet"
          onClick={() => {
            if (pet.evolutionIds.includes(EvolutionId.RIP) || pet.age >= 2) {
              window.location.href = "/create";
              return;
            }
            if (pet.age < 2) {
              onClose();
              showConfirmPopup();
            }
          }}
          className="hover:text-zinc-800 no-drag block py-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
        >
          new pet
        </motion.a>
      );
    }

    menuItems.push(
      <motion.a
        key="scrapbook"
        href="/dossiers"
        className="hover:text-zinc-800 no-drag block py-2"
        onClick={onClose}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2, delay: 0.1 }}
      >
        dossiers
      </motion.a>
    );

    menuItems.push(
      <motion.a
        key="about"
        href="/about"
        className="hover:text-zinc-800 no-drag block py-2"
        onClick={onClose}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2, delay: 0.2 }}
      >
        about
      </motion.a>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Dithered backdrop */}
          <motion.div
            className="fixed inset-0 z-40"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              backgroundColor: "rgba(0,0,0,0.4)",
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg width='4' height='4' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='0' y='0' width='2' height='2' fill='%23000' opacity='0.3'/%3E%3Crect x='2' y='2' width='2' height='2' fill='%23000' opacity='0.3'/%3E%3C/svg%3E\")",
              backgroundSize: "4px 4px",
            }}
          />
          {/* Menu panel */}
          <motion.div
            ref={ref}
            className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-black z-50 p-4"
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-zinc-500 text-lg">{menuItems}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

MobileMenu.displayName = "MobileMenu";

export default function Menu({
  page,
  variant = "default",
  extra,
}: {
  page: "play" | "create" | "dossiers" | "about";
  variant?: "default" | "dark";
  extra?: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [confirmPopupOpen, setConfirmPopupOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const { pet } = usePet();
  const isDark = variant === "dark";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node)
      ) {
        setMobileMenuOpen(false);
      }
    }

    if (mobileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [mobileMenuOpen]);

  const showConfirmPopup = () => {
    setConfirmPopupOpen(true);
  };

  const handleConfirm = () => {
    setConfirmPopupOpen(false);
    window.location.href = "/create";
  };

  const handleCancel = () => {
    setConfirmPopupOpen(false);
  };

  return (
    <>
      <div className={`w-full flex ${isDark ? "text-zinc-400" : "text-zinc-500"} text-lg`}>
        {/* Desktop Menu */}
        <div className={`hidden md:flex w-full ${isDark ? "items-center gap-4" : "justify-between"}`}>
          <MenuContent page={page} showConfirmPopup={showConfirmPopup} isDark={isDark} />
          {extra && <span className="ml-auto">{extra}</span>}
        </div>

        {/* Mobile Menu Button */}
        <div
          className={`flex md:hidden w-full justify-between items-center relative`}
          ref={menuRef}
        >
          <span className={isDark ? "ml-2 text-zinc-400" : "ml-2 text-zinc-500"}>{`${pathToText[page]}`}</span>
          <div className="flex items-center gap-2">
            {extra}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className={`border-2 w-8 h-8 flex flex-col items-center justify-center ${isDark ? "border-zinc-600 hover:bg-zinc-800" : "hover:bg-zinc-100"}`}
            >
              <svg
                width="16"
                height="12"
                viewBox="0 0 16 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect width="16" height="2" fill="currentColor" />
                <rect y="5" width="16" height="2" fill="currentColor" />
                <rect y="10" width="16" height="2" fill="currentColor" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <MobileMenu
        page={page}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        showConfirmPopup={showConfirmPopup}
        ref={mobileMenuRef}
      />

      {/* Confirm Popup */}
      <ConfirmPopup
        isOpen={confirmPopupOpen}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        petName={pet?.name || ""}
      />
    </>
  );
}
