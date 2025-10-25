"use client"

import type React from "react"

import { useState } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import Link from "next/link"
import {
  BookOpen,
  Brain,
  CheckCircle,
  Clock,
  FileText,
  GraduationCap,
  Highlighter,
  Library,
  Link as LinkIcon,
  Lock,
  Menu,
  MessageSquare,
  Shield,
  Sparkles,
  Target,
  X,
  Zap,
} from "lucide-react"

// Confetti component
const Confetti = ({ isVisible }: { isVisible: boolean }) => {
  if (!isVisible) return null

  const confettiPieces = Array.from({ length: 20 }, (_, i) => (
    <motion.div
      key={i}
      className="absolute w-2 h-2 rounded-full"
      style={{
        backgroundColor: ["#f97316", "#ec4899", "#a855f7", "#3b82f6"][i % 4],
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
      }}
      initial={{
        opacity: 1,
        scale: 0,
        y: 0,
        x: 0,
        rotate: 0,
      }}
      animate={{
        opacity: 0,
        scale: [0, 1, 0],
        y: [-20, -60, -100],
        x: [0, Math.random() * 40 - 20, Math.random() * 80 - 40],
        rotate: [0, 180, 360],
      }}
      transition={{
        duration: 1.5,
        ease: "easeOut",
        delay: Math.random() * 0.3,
      }}
    />
  ))

  return <div className="absolute inset-0 pointer-events-none overflow-hidden">{confettiPieces}</div>
}

export default function LandingPage() {
  const [email, setEmail] = useState("")
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const { scrollYProgress } = useScroll()
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"])

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const form = e.target as HTMLFormElement
    const formData = new FormData(form)

    try {
      // Submit to Formcarry
      await fetch(form.action, {
        method: form.method,
        body: formData,
        headers: {
          Accept: "application/json",
        },
      })

      // Trigger success animations
      setShowConfetti(true)
      setShowSuccessMessage(true)

      // Clear the input field
      setEmail("")

      // Hide animations after delay
      setTimeout(() => setShowConfetti(false), 2000)
      setTimeout(() => setShowSuccessMessage(false), 3000)
    } catch (error) {
      console.error("Form submission error:", error)
      // You could add error handling here
    }
  }

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      const headerHeight = 80 // Account for sticky header
      const elementPosition = element.offsetTop - headerHeight

      window.scrollTo({
        top: elementPosition,
        behavior: "smooth",
      })
    }
  }

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: "#FFF5F3" }}>
      {/* Sticky Header */}
      <motion.header
        className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-orange-100"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Image 
              src="/incourse_logo.png" 
              alt="InCourse Logo" 
              width={32} 
              height={32} 
              className="w-8 h-8"
            />
            <span className="text-xl font-bold text-gray-800 tracking-tight">InCourse</span>
          </div>

          <nav className="hidden md:flex items-center space-x-8">
            <button
              onClick={() => scrollToSection("demo")}
              className="text-gray-600 hover:text-orange-500 transition-colors duration-300 rounded-lg px-3 py-2 hover:bg-orange-50 font-medium"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection("features")}
              className="text-gray-600 hover:text-orange-500 transition-colors duration-300 rounded-lg px-3 py-2 hover:bg-orange-50 font-medium"
            >
              Use Cases
            </button>
            <button
              onClick={() => scrollToSection("roadmap")}
              className="text-gray-600 hover:text-orange-500 transition-colors duration-300 rounded-lg px-3 py-2 hover:bg-orange-50 font-medium"
            >
              Soon...
            </button>
            <Button
              variant="outline"
              className="rounded-lg border-orange-200 text-orange-600 hover:bg-orange-50 transition-all duration-300 font-medium"
              asChild
            >
              <Link href="/sign-in">Sign In</Link>
            </Button>
          </nav>

          <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </motion.header>
      {/* Hero Section */}
      <section id="hero" className="pt-24 pb-20 px-2 overflow-hidden min-h-screen flex items-center">
        <div className="container mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-8"
            >
              <div className="space-y-6">
                <motion.h1
                  className="text-5xl lg:text-6xl font-bold text-gray-800 leading-tight tracking-tight"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.8 }}
                >
                  College is hard.{" "}
                  <span className="bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
                    InCourse
                  </span>{" "}
                  makes it easier.
                </motion.h1>
                <motion.p
                  className="text-xl text-gray-600 leading-relaxed font-normal"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.8 }}
                >
                  AI-powered study tools that turn your coursework into flashcards, quizzes, and instant answers. Stop drowning in PDFs and start actually learning.
                </motion.p>
              </div>

              <motion.div
                className="relative"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.8 }}
              >
                <form
                  action="https://formcarry.com/s/7PPLg_SzU37"
                  method="POST"
                  onSubmit={handleEmailSubmit}
                  className="flex flex-col sm:flex-row gap-3 max-w-md relative"
                >
                  <div className="relative flex-1">
                    <Input
                      type="email"
                      name="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-lg border-orange-200 focus:border-orange-400 focus:ring-orange-200 transition-all duration-300 py-4 px-4 text-lg font-normal"
                      required
                    />
                    <Confetti isVisible={showConfetti} />
                  </div>
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white rounded-lg px-8 py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                  >
                    Join the waitlist
                  </Button>
                </form>

                {/* Success Message */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{
                    opacity: showSuccessMessage ? 1 : 0,
                    y: showSuccessMessage ? 0 : 10,
                  }}
                  transition={{ duration: 0.3 }}
                  className="mt-3 text-center"
                >
                  <span className="text-green-600 font-medium">You're on the waitlist! 🎉</span>
                </motion.div>
              </motion.div>

              <motion.div
                className="flex items-center space-x-4 text-sm text-gray-500"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.8 }}
              >
                <div className="flex items-center space-x-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="font-medium">Free to join</span>
                </div>
                <div className="flex items-center space-x-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="font-medium">Early access perks</span>
                </div>
              </motion.div>
            </motion.div>

            {/* Product Dashboard Visual */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="relative max-w-5xl mx-auto">
                {/* Browser Window Frame - Auto height */}
                <motion.div
                  className="bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-100"
                  whileHover={{ scale: 1.01 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Browser Header */}
                  <div className="bg-gray-50 px-3 py-2 border-b border-gray-100 flex items-center space-x-2">
                    <div className="flex space-x-1.5">
                      <div className="w-2.5 h-2.5 bg-red-400 rounded-full"></div>
                      <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full"></div>
                      <div className="w-2.5 h-2.5 bg-green-400 rounded-full"></div>
                    </div>
                    <div className="flex-1 bg-white rounded-md px-2 py-1 text-xs text-gray-500 ml-3 font-medium">
                      incourse.app/dashboard
                    </div>
                  </div>

                  {/* Dashboard Content - Auto height with proper spacing */}
                  <div className="p-4 bg-gradient-to-br from-orange-50 to-pink-50 min-h-fit">
                    {/* Header - Optimized */}
                    <div className="mb-4">
                      <h1 className="text-lg font-bold text-gray-900 mb-1">Good morning, Sarah!</h1>
                      <p className="text-xs text-gray-600 font-normal">
                        Here's what's happening with your learning today
                      </p>
                    </div>

                    {/* Main Content Grid - Auto height */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Recent Activity Card - Scrollable content */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6, duration: 0.5 }}
                        className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-lg transition-all duration-300"
                      >
                        <div className="p-3 border-b border-gray-100 flex-shrink-0">
                          <div className="flex justify-between items-center mb-2">
                            <h2 className="text-sm font-semibold text-gray-800">Recent Activity</h2>
                            <button className="text-xs text-gray-500 hover:text-gray-700 font-medium">View All</button>
                          </div>
                          {/* Simplified tabs */}
                          <div className="flex space-x-1 bg-gray-100 rounded-md p-0.5">
                            <div className="px-2 py-1 bg-white rounded text-xs font-medium text-gray-700 shadow-sm">
                              All
                            </div>
                            <div className="px-2 py-1 text-xs text-gray-500">Quizzes</div>
                            <div className="px-2 py-1 text-xs text-gray-500">Summaries</div>
                          </div>
                        </div>

                        <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
                          {/* Activity Items - Optimized sizing */}
                          <div className="flex items-start p-2.5 hover:bg-gray-50 transition-colors">
                            <div className="rounded-full p-1 mr-2 bg-blue-100 text-blue-600 flex-shrink-0">
                              <div className="w-2 h-2 bg-blue-600 rounded-sm"></div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-xs text-gray-800 mb-0.5">
                                Completed quiz on Data Structures
                              </p>
                              <p className="text-xs text-gray-500">CS 101 • 2 hours ago</p>
                            </div>
                            <span className="text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                              85%
                            </span>
                          </div>

                          <div className="flex items-start p-2.5 hover:bg-gray-50 transition-colors">
                            <div className="rounded-full p-1 mr-2 bg-green-100 text-green-600 flex-shrink-0">
                              <div className="w-2 h-2 bg-green-600 rounded-sm"></div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-xs text-gray-800 mb-0.5">
                                Read summary of Lecture 5: Fiscal Policy
                              </p>
                              <p className="text-xs text-gray-500">ECON 201 • Yesterday</p>
                            </div>
                          </div>

                          <div className="flex items-start p-2.5 hover:bg-gray-50 transition-colors">
                            <div className="rounded-full p-1 mr-2 bg-purple-100 text-purple-600 flex-shrink-0">
                              <div className="w-2 h-2 bg-purple-600 rounded-sm"></div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-xs text-gray-800 mb-0.5">
                                Practiced flashcards on Research Methods
                              </p>
                              <p className="text-xs text-gray-500">PSYCH 110 • 2 days ago</p>
                            </div>
                            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                              High Retention
                            </span>
                          </div>

                          <div className="flex items-start p-2.5 hover:bg-gray-50 transition-colors">
                            <div className="rounded-full p-1 mr-2 bg-orange-100 text-orange-600 flex-shrink-0">
                              <div className="w-2 h-2 bg-orange-600 rounded-sm"></div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-xs text-gray-800 mb-0.5">
                                Generated study guide for Midterm Exam
                              </p>
                              <p className="text-xs text-gray-500">HIST 205 • 3 days ago</p>
                            </div>
                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                              Ready
                            </span>
                          </div>

                          <div className="flex items-start p-2.5 hover:bg-gray-50 transition-colors">
                            <div className="rounded-full p-1 mr-2 bg-pink-100 text-pink-600 flex-shrink-0">
                              <div className="w-2 h-2 bg-pink-600 rounded-sm"></div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-xs text-gray-800 mb-0.5">
                                Reviewed notes for Chemistry Lab
                              </p>
                              <p className="text-xs text-gray-500">CHEM 150 • 4 days ago</p>
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-gray-100 bg-gray-50 p-2 flex-shrink-0">
                          <div className="flex justify-between items-center text-xs">
                            <div className="flex items-center text-gray-500">
                              <Clock className="mr-1 h-2.5 w-2.5" />
                              <span>Updated just now</span>
                            </div>
                            <button className="text-gray-500 hover:text-gray-700 font-medium">Refresh</button>
                          </div>
                        </div>
                      </motion.div>

                      {/* Smart Nudges Card - Scrollable content */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8, duration: 0.5 }}
                        className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-lg transition-all duration-300"
                      >
                        <div className="p-3 border-b border-gray-100 flex-shrink-0">
                          <div className="flex justify-between items-center mb-1">
                            <h2 className="text-sm font-semibold text-gray-800">Smart Nudges</h2>
                            <button className="text-xs text-gray-500 hover:text-gray-700 font-medium">
                              Mark All Read
                            </button>
                          </div>
                          <p className="text-xs text-gray-500">Your personalized learning recommendations</p>
                        </div>

                        <div className="p-3 space-y-2.5 max-h-[300px] overflow-y-auto">
                          {/* Optimized nudges */}
                          <div className="border border-red-200 bg-red-50 rounded-md p-2.5">
                            <div className="flex items-center space-x-1.5 mb-1.5">
                              <span className="text-xs font-medium text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                                CS 101
                              </span>
                              <span className="text-xs bg-red-200 text-red-800 px-1.5 py-0.5 rounded font-medium">
                                HIGH
                              </span>
                            </div>
                            <p className="text-xs font-medium text-gray-800 mb-0.5">
                              Time to review Arrays and Linked Lists
                            </p>
                            <p className="text-xs text-gray-600">Quiz in 2 days</p>
                          </div>

                          <div className="border border-yellow-200 bg-yellow-50 rounded-md p-2.5">
                            <div className="flex items-center space-x-1.5 mb-1.5">
                              <span className="text-xs font-medium text-yellow-700 bg-yellow-100 px-1.5 py-0.5 rounded">
                                ECON 201
                              </span>
                              <span className="text-xs bg-yellow-200 text-yellow-800 px-1.5 py-0.5 rounded font-medium">
                                MEDIUM
                              </span>
                            </div>
                            <p className="text-xs font-medium text-gray-800 mb-0.5">New lecture summary available</p>
                            <p className="text-xs text-gray-600">Posted yesterday</p>
                          </div>

                          <div className="border border-blue-200 bg-blue-50 rounded-md p-2.5">
                            <div className="flex items-center space-x-1.5 mb-1.5">
                              <span className="text-xs font-medium text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                                MATH 220
                              </span>
                              <span className="text-xs bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded font-medium">
                                MEDIUM
                              </span>
                            </div>
                            <p className="text-xs font-medium text-gray-800 mb-0.5">Problem Set 8 is now available</p>
                            <p className="text-xs text-gray-600">Due in 5 days</p>
                          </div>

                          <div className="border border-green-200 bg-green-50 rounded-md p-2.5">
                            <div className="flex items-center space-x-1.5 mb-1.5">
                              <span className="text-xs font-medium text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
                                PSYCH 110
                              </span>
                              <span className="text-xs bg-green-200 text-green-800 px-1.5 py-0.5 rounded font-medium">
                                LOW
                              </span>
                            </div>
                            <p className="text-xs font-medium text-gray-800 mb-0.5">
                              Great progress on Research Methods
                            </p>
                            <p className="text-xs text-gray-600">Keep up the excellent work!</p>
                          </div>

                          <div className="border border-purple-200 bg-purple-50 rounded-md p-2.5">
                            <div className="flex items-center space-x-1.5 mb-1.5">
                              <span className="text-xs font-medium text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                                PHIL 101
                              </span>
                              <span className="text-xs bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded font-medium">
                                MEDIUM
                              </span>
                            </div>
                            <p className="text-xs font-medium text-gray-800 mb-0.5">Essay draft feedback available</p>
                            <p className="text-xs text-gray-600">Review before final submission</p>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>

                {/* Floating Elements - Positioned outside content flow */}
                <motion.div
                  className="absolute -top-3 -right-3 w-12 h-12 bg-gradient-to-br from-yellow-200 to-orange-300 rounded-xl flex items-center justify-center shadow-lg z-10"
                  animate={{
                    y: [0, -10, 0],
                    rotate: [0, 5, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                  }}
                >
                  <Sparkles className="w-6 h-6 text-white" />
                </motion.div>

                <motion.div
                  className="absolute -bottom-4 -left-4 w-10 h-10 bg-gradient-to-br from-purple-200 to-pink-300 rounded-lg flex items-center justify-center shadow-lg z-10"
                  animate={{
                    y: [0, 10, 0],
                    rotate: [0, -5, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                    delay: 1,
                  }}
                >
                  <Brain className="w-5 h-5 text-white" />
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
      {/* How It Works Section */}
      {/* Product Demo Video Section */}
      <section id="demo" className="py-20 px-4 bg-white min-h-screen flex items-center">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-800 mb-4 tracking-tight">
              Your Entire Semester, Organized in Seconds
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed font-normal">
              Just one glance at your dashboard and you know what to do next
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-white p-2">
              <div className="aspect-video rounded-xl overflow-hidden">
                <iframe
                  width="100%"
                  height="100%"
                  src="https://www.youtube.com/embed/kjRJcuz_LLM?si=PMffM0LHSqhuccuR"
                  title="InCourse Product Demo"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
            </div>
          </motion.div>

          {/* Key highlights below video */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
            className="mt-12 grid md:grid-cols-3 gap-6 text-center"
          >
            {[
              {
                icon: <BookOpen className="w-6 h-6" />,
                title: "Works With Any File Type",
                description: "PDF, Word, PowerPoint, Excel—we handle them all so you can focus on learning",
              },
              {
                icon: <Brain className="w-6 h-6" />,
                title: "AI That Gets Smarter With You",
                description: "Chat, flashcards, quizzes, and instant grading powered by AI that understands your courses",
              },
              {
                icon: <Zap className="w-6 h-6" />,
                title: "Everything In One Place",
                description: "Calendar, notes, assignments, and study tools—no more juggling 10 different apps",
              },
            ].map((highlight, index) => (
              <div key={index} className="flex flex-col items-center space-y-3">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-400 to-pink-500 rounded-xl flex items-center justify-center text-white">
                  {highlight.icon}
                </div>
                <h3 className="font-semibold text-gray-800">{highlight.title}</h3>
                <p className="text-sm text-gray-600 font-normal">{highlight.description}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>
      {/* Features Section - Updated with Lottie Animations */}
      <section id="features" className="py-20 px-4 min-h-screen flex items-center" style={{ backgroundColor: "#FFF5F3" }}>
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-800 mb-4 tracking-tight">Why Students Love InCourse</h2>
            <p className="text-xl text-gray-600 leading-relaxed font-normal">
              We turned boring coursework into a personalized learning engine.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "Your Personal Study Coach",
                description: "Smart nudges tell you exactly what to review and when, based on your upcoming deadlines and past performance.",
                icon: <Target className="w-12 h-12 text-indigo-500" />,
              },
              {
                title: "Works With Your School's LMS",
                description: "Seamlessly syncs with Canvas, Moodle, and Blackboard. No manual uploads, no extra work.",
                icon: <LinkIcon className="w-12 h-12 text-teal-500" />,
              },
              {
                title: "AI Chat That Actually Understands Your Coursework",
                description: "Get instant answers from your lecture slides, textbooks, and notes—no more digging through PDFs at 2am.",
                icon: <MessageSquare className="w-12 h-12 text-orange-500" />,
              },
              {
                title: "The Smartest Notes You'll Ever Take",
                description: "A powerful editor that handles math equations, code syntax highlighting, tables, and images—with an AI assistant that answers questions without leaving your notes.",
                icon: <FileText className="w-12 h-12 text-blue-500" />,
              },
              {
                title: "Instant Feedback on Your Work",
                description: "Upload your assignment solutions and get detailed AI feedback before you submit—like having a TA available 24/7.",
                icon: <CheckCircle className="w-12 h-12 text-green-500" />,
              },
              {
                title: "Study Smarter, Not Harder",
                description: "Generate custom flashcards and practice quizzes from any document in seconds. Focus on what you need to learn, not what to study.",
                icon: <Brain className="w-12 h-12 text-purple-500" />,
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group"
              >
                <Card className="min-h-[360px] border border-gray-200 bg-white shadow-sm hover:shadow-lg transition-all duration-300 rounded-xl group-hover:-translate-y-1 group-hover:scale-[1.01] transform">
                  <CardContent className="py-6 px-6 flex flex-col justify-center items-center text-center space-y-4 h-full">
                    {/* Icon */}
                    <div className="flex-shrink-0">
                      <div className="w-20 h-20 bg-gray-50 rounded-xl flex items-center justify-center">
                        {feature.icon}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex flex-col items-center space-y-3">
                      <h3 className="text-xl font-bold text-gray-800 group-hover:text-gray-900 transition-colors tracking-tight leading-tight">
                        {feature.title}
                      </h3>
                      <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors font-normal">
                        {feature.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      {/* Roadmap Section - Updated with better error handling */}
      <section id="roadmap" className="py-20 px-4 bg-white min-h-screen flex items-center">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-800 mb-4 tracking-tight">What's Coming Next</h2>
            <p className="text-xl text-gray-600 leading-relaxed font-normal">Exciting features in development</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "AutoPilot",
                description: "Your AI copilot for drafting, summarizing, and crushing your to-do list.",
                status: "Coming Soon",
                icon: <div className="text-4xl">🧭</div>,
              },
              {
                title: "Customizable Agents",
                description: "Shape how your AI behaves to match your unique learning flow.",
                status: "In Development",
                useImage: true,
              },
              {
                title: "Project Boards",
                description: "Track group work and solo projects — all inside your dashboard.",
                status: "Planned",
                icon: <div className="text-4xl">📊</div>,
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.2 }}
                viewport={{ once: true }}
                className="group"
              >
                <Card className="min-h-[320px] border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 rounded-xl group-hover:-translate-y-1 group-hover:scale-[1.01] transform" style={{ backgroundColor: "#FEF7F3" }}>
                  <CardContent className="py-6 px-6 flex flex-col justify-start items-center text-center space-y-4 h-full">
                    {/* Icon/Animation */}
                    <div className="flex-shrink-0">
                      <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center">
                        {item.useImage ? (
                          <div className="text-4xl">🤖</div>
                        ) : (
                          item.icon
                        )}
                      </div>
                    </div>

                    {/* Status Badge with spacing */}
                    <div className="mb-3">
                      <Badge variant="secondary" className="rounded-lg font-medium">
                        {item.status}
                      </Badge>
                    </div>

                    {/* Content */}
                    <div className="flex flex-col items-center space-y-3">
                      <h3 className="text-xl font-bold text-gray-800 group-hover:text-gray-900 transition-colors tracking-tight leading-tight">
                        {item.title}
                      </h3>
                      <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors font-normal">
                        {item.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      {/* Trust Section */}
      <section className="py-20 px-4" style={{ backgroundColor: "#FFF5F3" }}>
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            {[
              {
                icon: <GraduationCap className="w-8 h-8" />,
                title: "Built by Students",
                description: "Developed at Howard University by students who live the same grind.",
              },
              {
                icon: <Shield className="w-8 h-8" />,
                title: "FERPA Compliant",
                description: "Your educational data is never shared with any institutions",
              },
              {
                icon: <Lock className="w-8 h-8" />,
                title: "Privacy First",
                description: "We never share your personal information with third parties",
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.2 }}
                viewport={{ once: true }}
                className="group"
              >
                <Card className="border border-gray-200 bg-white shadow-sm hover:shadow-lg transition-all duration-300 rounded-xl group-hover:-translate-y-1 transform">
                  <CardContent className="py-8 px-6 space-y-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-orange-400 to-pink-500 rounded-xl flex items-center justify-center text-white mx-auto">
                      {item.icon}
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 tracking-tight group-hover:text-gray-900 transition-colors">{item.title}</h3>
                    <p className="text-gray-600 leading-relaxed font-normal group-hover:text-gray-700 transition-colors">{item.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      {/* Final CTA Section */}
      <section className="py-24 px-4 relative overflow-hidden min-h-screen flex items-center bg-white">
        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <h2 className="text-5xl font-bold tracking-tight text-gray-800">Stop Stressing...</h2>
            <p className="text-xl font-normal leading-relaxed text-gray-600">
              Students at schools like Columbia, Howard & Georgia Tech are already in. Join them.
            </p>

            <form
              action="https://formcarry.com/s/7PPLg_SzU37"
              method="POST"
              onSubmit={handleEmailSubmit}
              className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
            >
              <div className="relative flex-1">
                <Input
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border-orange-200 focus:border-orange-400 focus:ring-orange-200 transition-all duration-300 py-4 px-4 text-lg font-normal"
                  required
                />
                <Confetti isVisible={showConfetti} />
              </div>
              <Button
                type="submit"
                className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white rounded-lg px-8 py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                Join the waitlist
              </Button>
            </form>

            {/* Success Message */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{
                opacity: showSuccessMessage ? 1 : 0,
                y: showSuccessMessage ? 0 : 10,
              }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              <span className="text-green-600 font-medium">You're on the waitlist! 🎉</span>
            </motion.div>

            <motion.div
              className="flex items-center justify-center space-x-4 text-sm text-gray-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.8 }}
            >
              <div className="flex items-center space-x-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="font-medium">Free to join</span>
              </div>
              <div className="flex items-center space-x-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="font-medium">Early access perks</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>
      {/* Footer */}
      <footer className="py-8 px-4 bg-gray-900 text-white">
        <div className="container mx-auto max-w-6xl text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Image 
              src="/incourse_logo.png" 
              alt="InCourse Logo" 
              width={32} 
              height={32} 
              className="w-8 h-8"
            />
            <span className="text-xl font-bold tracking-tight">InCourse</span>
          </div>
          <p className="text-gray-400 font-normal">© 2025 InCourse. Built with ❤️ by students, for students.</p>
        </div>
      </footer>
    </div>
  )
}