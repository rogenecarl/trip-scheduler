"use client";

import {
  Sparkles,
  FileSpreadsheet,
  Users,
  CalendarDays,
  Clock,
  Shield,
} from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Sparkles,
    title: "AI-Powered Assignment",
    description:
      "Gemini AI automatically matches drivers to trips based on their availability, ensuring optimal scheduling every time.",
  },
  {
    icon: FileSpreadsheet,
    title: "CSV Import",
    description:
      "Bulk import your trips from spreadsheets. Upload a CSV file and schedule multiple trips in seconds.",
  },
  {
    icon: Users,
    title: "Driver Management",
    description:
      "Easily manage your driver roster. Add, edit, or remove drivers and set their weekly availability.",
  },
  {
    icon: CalendarDays,
    title: "Calendar View",
    description:
      "Visual overview of all scheduled trips and driver availability. See your entire operation at a glance.",
  },
  {
    icon: Clock,
    title: "Real-time Updates",
    description:
      "Changes sync instantly across the platform. Everyone stays on the same page, always.",
  },
  {
    icon: Shield,
    title: "Conflict Prevention",
    description:
      "Smart scheduling prevents double-booking and ensures drivers are only assigned when available.",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const headerVariants = {
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

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut" as const,
    },
  },
};

export default function FeaturesSection() {
  return (
    <section id="features" className="bg-muted/30 py-20 sm:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="mx-auto max-w-2xl text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={headerVariants}
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to manage trips
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Powerful features designed to streamline your trip scheduling
            workflow and keep your drivers organized.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={containerVariants}
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              className="group relative rounded-2xl border bg-card p-6 transition-shadow hover:shadow-lg"
              variants={cardVariants}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
            >
              {/* Icon */}
              <motion.div
                className="mb-4 flex size-12 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <feature.icon className="size-6 text-primary" />
              </motion.div>

              {/* Content */}
              <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
