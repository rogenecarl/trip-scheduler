"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut" as const,
    },
  },
};

const floatVariants = {
  animate: {
    y: [-10, 10, -10],
    transition: {
      duration: 6,
      repeat: Infinity,
      ease: "easeInOut" as const,
    },
  },
};

const floatDelayedVariants = {
  animate: {
    y: [10, -10, 10],
    transition: {
      duration: 7,
      repeat: Infinity,
      ease: "easeInOut" as const,
      delay: 1,
    },
  },
};

const floatSlowVariants = {
  animate: {
    y: [-15, 15, -15],
    transition: {
      duration: 8,
      repeat: Infinity,
      ease: "easeInOut" as const,
      delay: 2,
    },
  },
};

export default function HeroSection() {
  return (
    <section className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center overflow-hidden bg-background">
      {/* Animated background elements */}
      <div className="absolute inset-0 -z-10">
        {/* Floating gradient orbs */}
        <motion.div
          className="absolute left-1/2 top-1/4 -translate-x-1/2 -translate-y-1/2 size-[600px] rounded-full bg-primary/10 blur-3xl"
          variants={floatVariants}
          animate="animate"
        />
        <motion.div
          className="absolute right-1/4 bottom-1/4 size-[450px] rounded-full bg-primary/5 blur-3xl"
          variants={floatDelayedVariants}
          animate="animate"
        />
        <motion.div
          className="absolute left-1/4 bottom-1/3 size-[350px] rounded-full bg-primary/5 blur-3xl"
          variants={floatSlowVariants}
          animate="animate"
        />

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px),
                             linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
            backgroundSize: "80px 80px",
          }}
        />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <motion.div
          className="flex flex-col items-center text-center gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Headline */}
          <motion.h1
            className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
            variants={itemVariants}
          >
            <span className="block">Smart Trip Scheduling</span>
            <span className="block bg-gradient-to-r from-primary via-primary/70 to-primary bg-clip-text text-transparent">
              Made Effortless
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            className="text-lg text-muted-foreground sm:text-xl max-w-2xl leading-relaxed"
            variants={itemVariants}
          >
            Automatically assign drivers to trips based on availability.
            Eliminate scheduling conflicts, reduce manual work, and keep your
            fleet operations running at peak efficiency.
          </motion.p>

          {/* CTAs */}
          <motion.div
            className="flex flex-col sm:flex-row gap-4 mt-4"
            variants={itemVariants}
          >
            <Button
              asChild
              size="lg"
              className="gap-2 group transition-all duration-300 hover:scale-105 hover:shadow-lg"
            >
              <Link href="/dashboard">
                Get Started
                <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </Button>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 pt-12 text-sm text-muted-foreground"
            variants={itemVariants}
          >
            {[
              "No scheduling conflicts",
              "Instant AI assignments",
              "Real-time availability",
            ].map((text, index) => (
              <motion.div
                key={text}
                className="flex items-center gap-2"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 + index * 0.1, duration: 0.4 }}
                whileHover={{ scale: 1.05 }}
              >
                <motion.div
                  className="size-2 rounded-full bg-green-500"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: index * 0.2,
                  }}
                />
                <span>{text}</span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom fade gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
}
