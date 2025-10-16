import { Check, X } from "lucide-react";

interface PricingFeature {
  text: string;
  included: boolean;
}

interface PricingPlan {
  name: string;
  featured?: boolean;
  features: PricingFeature[];
}

interface PricingTableProps {
  plans: PricingPlan[];
}

export function PricingTable({ plans }: PricingTableProps) {
  return (
    <div className="overflow-x-auto rounded-[20px]">
      <div className="flex min-w-[600px]">
        {plans.map((plan, index) => (
          <div
            key={index}
            className={`flex-1 min-w-[200px] ${
              plan.featured
                ? "bg-[#f8f9fa] border border-[#e9e9e9] rounded-[20px]"
                : ""
            }`}
          >
            <div className="border-b border-[#cecece] py-10 px-8 text-center">
              <h3
                className={`text-2xl font-medium ${
                  plan.featured ? "text-black" : "text-[#6f6f6f]"
                } font-playfair`}
              >
                {plan.name}
              </h3>
            </div>

            <div className="space-y-0">
              {plan.features.map((feature, featureIndex) => (
                <div
                  key={featureIndex}
                  className="border-b border-[#e9e9e9]/50 py-4 px-8 flex items-center gap-2"
                >
                  {feature.included ? (
                    <Check className="w-4.5 h-4.5 text-black flex-shrink-0" />
                  ) : (
                    <X className="w-4.5 h-4.5 text-black flex-shrink-0" />
                  )}
                  <span className="text-black text-sm font-playfair">
                    {feature.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
