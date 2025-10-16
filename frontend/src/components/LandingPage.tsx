"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CTAButton } from "@/components/ui/cta-button";
import { FeatureSection } from "@/components/FeatureSection";
import { PricingTable } from "@/components/PricingTable";
import { ArrowRight } from "lucide-react";

// Image assets (placeholder URLs - these would be replaced with actual assets)
const imgArrowLeft = "/api/placeholder/40/40";
const imgArrowRight = "/api/placeholder/40/40";
const imgCheck = "/api/placeholder/12/12";
const imgClose = "/api/placeholder/12/12";
const imgArrow = "/api/placeholder/6/6";
const imgSocialLink1 = "/api/placeholder/24/24";
const imgSocialLink2 = "/api/placeholder/24/24";
const imgSocialLink3 = "/api/placeholder/24/24";

export default function LandingPage() {
  const [currentFeature, setCurrentFeature] = useState(0);

  // Placeholder functions for button clicks
  const handleJoinWaitlist = () => {
    alert("Join waitlist functionality will be implemented soon!");
  };

  const handleNavigationClick = (section: string) => {
    alert(`${section} section will be implemented soon!`);
  };

  const features = [
    {
      title: "Real-Time Answers",
      subtitle: "Get summaries and explanations instantly",
      items: [
        "No more switching apps or tabs to find chatgpt.",
        "AI works with you to help you learn right alongside your lectures",
        "Look intelligent to your professors.",
      ],
    },
    {
      title: "Proactive learning",
      subtitle: "Know what to study, when, and why.",
      items: [
        "Get updates on what assignments you have due with detailed steps on how to solve them",
        "Ready made slides from your notes to help you feel ready for presentations",
        "Exam study guides to get you prepared",
      ],
    },
    {
      title: "Integrate your existing knowledge",
      subtitle:
        "Upload your personal notes, connect Notion or your Drive to tailor your study material.",
      items: [
        "AI gets trained on your personal notes to make it more accurate",
        "Generate more comprehensive quizzes and flashcards with more personalized knowledge sources",
        "Create quick comprehensive cheat sheets that cover your knowledge gaps.",
      ],
    },
  ];

  const pricingPlans = [
    {
      name: "Free",
      features: [
        { text: "Unlimited", included: true },
        { text: "Basic AI recommendations", included: true },
        { text: "Restricts customization", included: true },
        { text: "Basic AI insights", included: false },
        { text: "Fast browsing", included: true },
        { text: "Potential display errors", included: false },
      ],
    },
    {
      name: "Viber",
      featured: true,
      features: [
        { text: "Unlimited chats", included: true },
        { text: "Unlimited quiz and flashcard generations", included: true },
        { text: "10 file uploads", included: true },
        { text: "7 image generations / day", included: true },
        { text: "All external knowledge intergrations", included: true },
        { text: "30 day version history", included: true },
        { text: "Mock practice exams", included: true },
      ],
    },
    {
      name: "Scholar",
      features: [
        { text: "Everything in Viber +", included: true },
        { text: "Unlimited image generations", included: true },
        { text: "Unlimited version history", included: true },
        { text: "Project collaboration boards", included: true },
        { text: "Customizable AI Assistant behavior", included: true },
        { text: "Study collaboration journals", included: true },
        { text: "Access to real-time AI voice mode", included: true },
      ],
    },
  ];

  return (
    <div className="bg-[#f8f9fa] min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-[15px] bg-white/40">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-10 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-2xl sm:text-3xl font-medium text-black tracking-[-1.5px]">
              InCourse
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <button
              className="text-sm font-bold text-black hover:text-gray-600 transition-colors"
              onClick={() => handleNavigationClick("Pricing")}
            >
              Pricing
            </button>
            <button
              className="text-sm font-bold text-black hover:text-gray-600 transition-colors"
              onClick={() => handleNavigationClick("Blog")}
            >
              Blog
            </button>
            <button
              className="text-sm font-bold text-black hover:text-gray-600 transition-colors"
              onClick={() => handleNavigationClick("Features")}
            >
              Features
            </button>
            <CTAButton variant="teal" onClick={handleJoinWaitlist}>
              Join the waitlist :)
            </CTAButton>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <CTAButton variant="teal" onClick={handleJoinWaitlist}>
              Join waitlist
            </CTAButton>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-10">
        <div className="max-w-[1500px] mx-auto">
          <div className="text-center max-w-6xl mx-auto">
            <h1 className="text-4xl sm:text-6xl md:text-8xl lg:text-[160px] leading-[0.9] font-crimson text-black tracking-[-6.8px] mb-10">
              AI Assistant that lives in your lectures.
            </h1>
            <p className="text-[#6f6f6f] text-sm sm:text-[15px] leading-[1.4] tracking-[-0.075px] mb-16 font-dm-sans px-4">
              Make learning feel easier with AI that understands you lectures
              and your learning style. <br className="hidden sm:block" />
              <span className="sm:hidden"> </span>No switching between apps.
            </p>

            {/* Hero Image Placeholder */}
            <div className="bg-teal-600 h-[200px] sm:h-[300px] lg:h-[362px] rounded-[30px] relative overflow-hidden mx-4 sm:mx-0">
              <div className="absolute inset-0 bg-black/10 rounded-[30px] flex items-center justify-center">
                <div className="text-white text-lg sm:text-2xl font-bold px-4">
                  Hero Image Placeholder
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-10">
        <div className="max-w-[1500px] mx-auto text-center">
          <p className="text-[#6f6f6f] text-sm sm:text-[15px] mb-8 font-dm-sans">
            Loved by students at:
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-8 sm:gap-16">
            <div className="h-16 sm:h-20 w-32 sm:w-48 bg-gray-200 rounded flex items-center justify-center">
              <span className="text-gray-500 text-xs sm:text-sm">
                University Logo 1
              </span>
            </div>
            <div className="h-20 sm:h-24 w-32 sm:w-44 bg-gray-200 rounded flex items-center justify-center">
              <span className="text-gray-500 text-xs sm:text-sm">
                University Logo 2
              </span>
            </div>
            <div className="h-16 sm:h-20 w-28 sm:w-36 bg-gray-200 rounded flex items-center justify-center">
              <span className="text-gray-500 text-xs sm:text-sm">
                University Logo 3
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-10 lg:py-20 px-4 sm:px-6 lg:px-10">
        <div className="max-w-[1500px] mx-auto">
          {features.map((feature, index) => (
            <FeatureSection
              key={index}
              title={feature.title}
              subtitle={feature.subtitle}
              items={feature.items}
              imagePlaceholder={`Feature Image ${index + 1}`}
              reverse={index % 2 === 1}
              onJoinWaitlist={handleJoinWaitlist}
            />
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-10 lg:py-20 px-4 sm:px-6 lg:px-10">
        <div className="max-w-[1500px] mx-auto">
          <div className="text-center mb-8 lg:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-[60px] leading-[0.9] font-crimson text-black tracking-[-1.8px] mb-6 lg:mb-10">
              Spend Less To Learn
            </h2>
            <p className="text-[#6f6f6f] text-sm sm:text-[15px] leading-[1.4] tracking-[-0.075px] mb-6 lg:mb-10 font-dm-sans px-4">
              You don't have to pay for multiple AI tools, Chegg or Quizlet. All
              the learning tools you will ever need together on one app.
            </p>
            <CTAButton onClick={handleJoinWaitlist}>
              Join the waitlist :)
            </CTAButton>
          </div>

          {/* Pricing Table */}
          <PricingTable plans={pricingPlans} />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-10 lg:py-20 px-4 sm:px-6 lg:px-10">
        <div className="max-w-[1500px] mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-[60px] leading-[0.9] font-crimson text-black tracking-[-1.8px] mb-6 lg:mb-10">
            Join our closed beta and make your learning easier
          </h2>
          <p className="text-[#6f6f6f] text-sm sm:text-[15px] leading-[1.4] tracking-[-0.075px] mb-6 lg:mb-10 font-dm-sans px-4">
            Student that sign up with an .edu email get 15% off all semester
            plans.
          </p>
          <CTAButton variant="teal" showArrow onClick={handleJoinWaitlist}>
            Join the waitlist :)
          </CTAButton>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#e9e9e9] py-8 lg:py-10 px-4 sm:px-6 lg:px-10">
        <div className="max-w-[1500px] mx-auto">
          <div className="flex flex-col lg:flex-row justify-between items-start gap-8 lg:gap-10">
            <div className="flex flex-col gap-3">
              <div className="text-2xl lg:text-3xl font-medium text-black">
                InCourse
              </div>
              <div className="flex gap-6 lg:gap-8">
                <button
                  className="w-5 h-5 lg:w-6 lg:h-6 bg-gray-300 rounded"
                  aria-label="Social media link 1"
                ></button>
                <button
                  className="w-5 h-5 lg:w-6 lg:h-6 bg-gray-300 rounded"
                  aria-label="Social media link 2"
                ></button>
                <button
                  className="w-5 h-5 lg:w-6 lg:h-6 bg-gray-300 rounded"
                  aria-label="Social media link 3"
                ></button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 lg:gap-10 w-full lg:w-auto">
              <div className="flex-1">
                <h4 className="text-sm lg:text-base font-semibold text-black mb-3 lg:mb-4 font-inter">
                  Features
                </h4>
                <div className="space-y-2">
                  <p className="text-[rgba(0,0,0,0.55)] text-sm lg:text-base font-inter">
                    In the works
                  </p>
                  <p className="text-[rgba(0,0,0,0.55)] text-sm lg:text-base font-inter">
                    Leave a suggestion
                  </p>
                </div>
              </div>

              <div className="flex-1">
                <h4 className="text-sm lg:text-base font-semibold text-black mb-3 lg:mb-4 font-inter">
                  Learn more
                </h4>
                <div className="space-y-2">
                  <p className="text-[rgba(0,0,0,0.55)] text-sm lg:text-base font-inter">
                    Our Mission
                  </p>
                  <p className="text-[rgba(0,0,0,0.55)] text-sm lg:text-base font-inter">
                    Careers
                  </p>
                  <p className="text-[rgba(0,0,0,0.55)] text-sm lg:text-base font-inter">
                    Privacy Policy
                  </p>
                  <p className="text-[rgba(0,0,0,0.55)] text-sm lg:text-base font-inter">
                    Terms of Service
                  </p>
                </div>
              </div>

              <div className="flex-1">
                <h4 className="text-sm lg:text-base font-semibold text-black mb-3 lg:mb-4 font-inter">
                  Support
                </h4>
                <div className="space-y-2">
                  <p className="text-[rgba(0,0,0,0.55)] text-sm lg:text-base font-inter">
                    Contact Us
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
