import { CTAButton } from "@/components/ui/cta-button";

interface FeatureSectionProps {
  title: string;
  subtitle: string;
  items: string[];
  imagePlaceholder: string;
  reverse?: boolean;
  onJoinWaitlist?: () => void;
}

export function FeatureSection({
  title,
  subtitle,
  items,
  imagePlaceholder,
  reverse = false,
  onJoinWaitlist,
}: FeatureSectionProps) {
  return (
    <div
      className={`flex flex-col lg:flex-row gap-5 mb-32 ${
        reverse ? "lg:flex-row-reverse" : ""
      }`}
    >
      <div className="flex-1 border-t border-[#e9e9e9] pt-8 lg:pt-16 pb-8 lg:pb-20">
        <div className="pr-0 lg:pr-20">
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-[60px] leading-[0.9] font-playfair text-black tracking-[-1.8px] mb-6 lg:mb-10">
            {title}
          </h2>
          <p className="text-[#6f6f6f] text-sm sm:text-[15px] leading-[1.4] tracking-[-0.075px] mb-6 lg:mb-10 font-playfair">
            {subtitle}
          </p>

          <div className="space-y-0">
            {items.map((item, itemIndex) => (
              <div
                key={itemIndex}
                className="border-t border-[#e9e9e9] py-4 lg:py-5 flex gap-4 lg:gap-8 items-start"
              >
                <span className="text-[#6f6f6f] text-sm sm:text-[15px] font-bold w-6 lg:w-8 flex-shrink-0 font-playfair">
                  {String(itemIndex + 1).padStart(2, "0")}
                </span>
                <p className="text-black text-sm sm:text-[15px] leading-[1.4] tracking-[-0.075px] font-playfair">
                  {item}
                </p>
              </div>
            ))}
          </div>

          <CTAButton className="mt-6 lg:mt-10" onClick={onJoinWaitlist}>
            Join the waitlist :)
          </CTAButton>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="bg-black/5 rounded-[30px] p-4 lg:p-8 w-full h-[250px] sm:h-[300px] lg:h-[400px] flex items-center justify-center">
          <div className="text-gray-500 text-sm sm:text-lg text-center px-4 font-playfair">
            {imagePlaceholder}
          </div>
        </div>
      </div>
    </div>
  );
}
